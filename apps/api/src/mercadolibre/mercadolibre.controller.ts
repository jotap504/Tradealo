import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { and, eq, desc, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { MercadolibreOauthService } from './mercadolibre-oauth.service';
import { MercadolibreApiClient } from './mercadolibre-api.client';
import { MlImportRunner } from './ml-import-runner.service';

type DB = NodePgDatabase<typeof schema>;

const PROVIDER = 'mercadolibre';
const MAX_ITEMS_PER_JOB = 200;
const APP_REDIRECT_BASE = process.env.APP_URL ?? 'https://trocalia.com.ar';

@Controller('mercadolibre')
export class MercadolibreController {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly oauth: MercadolibreOauthService,
    private readonly api: MercadolibreApiClient,
    private readonly runner: MlImportRunner,
  ) {}

  @Get('connection')
  async getConnection(@CurrentUser() user: JwtPayload) {
    const row = await this.oauth.getConnection(user.sub);
    if (!row) return { connected: false };
    return {
      connected: true,
      nickname: row.externalNickname,
      siteId: row.siteId,
      externalUserId: row.externalUserId,
      lastValidatedAt: row.lastValidatedAt,
      expiresAt: row.expiresAt,
    };
  }

  @Get('connect')
  async connect(@CurrentUser() user: JwtPayload) {
    await this.ensureMiTienda(user.sub);
    if (!this.oauth.isConfigured()) {
      throw new BadRequestException('MERCADOLIBRE_NOT_CONFIGURED');
    }
    return { url: this.oauth.getAuthorizeUrl(user.sub) };
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      return res.redirect(
        `${APP_REDIRECT_BASE}/my-shop/integrations?ml=error&reason=missing_params`,
      );
    }
    try {
      const { userId, siteId } = await this.oauth.completeOAuth(code, state);
      if (siteId !== 'MLA') {
        await this.oauth.disconnect(userId);
        return res.redirect(
          `${APP_REDIRECT_BASE}/my-shop/integrations?ml=blocked_site`,
        );
      }
      return res.redirect(
        `${APP_REDIRECT_BASE}/my-shop/integrations?ml=connected`,
      );
    } catch (err) {
      const fullMsg = (err as Error).message ?? 'unknown';
      // eslint-disable-next-line no-console
      console.error('[ML callback error]', fullMsg);
      const msg = encodeURIComponent(fullMsg.slice(0, 500));
      return res.redirect(
        `${APP_REDIRECT_BASE}/my-shop/integrations?ml=error&reason=${msg}`,
      );
    }
  }

  @Delete('connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentUser() user: JwtPayload) {
    await this.oauth.disconnect(user.sub);
  }

  @Get('items')
  async listItems(
    @CurrentUser() user: JwtPayload,
    @Query('scrollId') scrollId?: string,
  ) {
    const conn = await this.oauth.getConnection(user.sub);
    if (!conn || !conn.externalUserId) {
      throw new ForbiddenException('MERCADOLIBRE_NOT_CONNECTED');
    }
    const accessToken = await this.oauth.getAccessToken(user.sub);
    const page = await this.api.listUserItemIds(
      conn.externalUserId,
      accessToken,
      scrollId,
    );

    const items = await this.api.getItemsBatch(page.ids, accessToken);
    const existing =
      items.length > 0
        ? await this.db
            .select({ sourceProductId: schema.listings.sourceProductId })
            .from(schema.listings)
            .where(
              and(
                eq(schema.listings.userId, user.sub),
                eq(schema.listings.sourceProvider, PROVIDER),
                inArray(
                  schema.listings.sourceProductId,
                  items.map((i) => i.id),
                ),
              ),
            )
        : [];
    const taken = new Set(existing.map((e) => e.sourceProductId));

    return {
      scrollId: page.scrollId,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        currency: i.currency_id,
        condition: i.condition,
        thumbnail: i.pictures?.[0]?.url ?? null,
        alreadyImported: taken.has(i.id),
      })),
    };
  }

  @Post('imports')
  async startImport(
    @CurrentUser() user: JwtPayload,
    @Body() body: { itemIds: string[] | 'all' },
  ) {
    await this.ensureMiTienda(user.sub);
    const conn = await this.oauth.getConnection(user.sub);
    if (!conn || !conn.externalUserId) {
      throw new ForbiddenException('MERCADOLIBRE_NOT_CONNECTED');
    }

    let itemIds: string[] = [];
    if (body.itemIds === 'all') {
      const accessToken = await this.oauth.getAccessToken(user.sub);
      let scroll: string | null = null;
      do {
        const page = await this.api.listUserItemIds(
          conn.externalUserId,
          accessToken,
          scroll,
        );
        itemIds.push(...page.ids);
        scroll = page.scrollId;
        if (itemIds.length >= MAX_ITEMS_PER_JOB) break;
      } while (scroll);
      itemIds = itemIds.slice(0, MAX_ITEMS_PER_JOB);
    } else if (Array.isArray(body.itemIds)) {
      if (body.itemIds.length > MAX_ITEMS_PER_JOB) {
        throw new BadRequestException(
          `MAX_${MAX_ITEMS_PER_JOB}_ITEMS_PER_JOB`,
        );
      }
      itemIds = body.itemIds;
    } else {
      throw new BadRequestException('INVALID_ITEM_IDS');
    }

    if (itemIds.length === 0) {
      throw new BadRequestException('NO_ITEMS_TO_IMPORT');
    }

    const [created] = await this.db
      .insert(schema.importJobs)
      .values({
        userId: user.sub,
        provider: PROVIDER,
        status: 'queued',
        totalItems: itemIds.length,
      })
      .returning();

    await this.db.insert(schema.importJobItems).values(
      itemIds.map((id) => ({
        jobId: created.id,
        externalProductId: id,
      })),
    );

    this.runner.start(created.id);

    return { jobId: created.id, totalItems: itemIds.length };
  }

  @Get('imports')
  async listJobs(@CurrentUser() user: JwtPayload) {
    const rows = await this.db
      .select()
      .from(schema.importJobs)
      .where(eq(schema.importJobs.userId, user.sub))
      .orderBy(desc(schema.importJobs.createdAt))
      .limit(50);
    return { data: rows };
  }

  @Get('imports/:id')
  async getJob(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const [job] = await this.db
      .select()
      .from(schema.importJobs)
      .where(
        and(
          eq(schema.importJobs.id, id),
          eq(schema.importJobs.userId, user.sub),
        ),
      )
      .limit(1);
    if (!job) throw new BadRequestException('JOB_NOT_FOUND');
    const items = await this.db
      .select()
      .from(schema.importJobItems)
      .where(eq(schema.importJobItems.jobId, id))
      .limit(MAX_ITEMS_PER_JOB);
    return { job, items };
  }

  private async ensureMiTienda(userId: string): Promise<void> {
    const [sub] = await this.db
      .select({ status: schema.shopSubscriptions.status })
      .from(schema.shopSubscriptions)
      .where(eq(schema.shopSubscriptions.userId, userId))
      .limit(1);
    if (!sub || sub.status !== 'active') {
      throw new ForbiddenException('MI_TIENDA_REQUIRED');
    }
  }
}
