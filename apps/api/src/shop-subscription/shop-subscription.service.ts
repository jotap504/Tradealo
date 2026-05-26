import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { shopSubscriptions, sellerShops } from '../database/schema';
import { ShopService } from '../shop/shop.service';

type DB = NodePgDatabase<typeof schema>;

interface MpWebhookBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

@Injectable()
export class ShopSubscriptionService {
  private readonly logger = new Logger(ShopSubscriptionService.name);
  private readonly preApproval: PreApproval;
  private readonly webhookSecret: string;
  private readonly backUrl: string;
  private readonly subscriptionPriceArs: number;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly shopService: ShopService,
  ) {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN ?? '',
    });
    this.preApproval = new PreApproval(client);
    this.webhookSecret = process.env.MP_WEBHOOK_SECRET ?? '';
    this.backUrl = process.env.APP_URL ?? 'https://trocalia.ar';
    this.subscriptionPriceArs = Number(
      process.env.SHOP_SUBSCRIPTION_PRICE_ARS ?? '2999',
    );
  }

  async subscribe(userId: string, userEmail: string) {
    const [existing] = await this.db
      .select()
      .from(shopSubscriptions)
      .where(
        and(
          eq(shopSubscriptions.userId, userId),
          eq(shopSubscriptions.status, 'active'),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('Already have an active subscription');
    }

    const shop = await this.shopService.initShop(userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.preApproval.create({
      body: {
        reason: 'Trocalia Seller Shop — Suscripción Mensual',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: this.subscriptionPriceArs,
          currency_id: 'ARS',
        },
        payer_email: userEmail,
        back_url: `${this.backUrl}/my-shop/subscription?result=success`,
        external_reference: `${userId}|${shop.id}`,
        status: 'pending',
      } as any,
    });

    await this.db.insert(shopSubscriptions).values({
      userId,
      shopId: shop.id,
      status: 'trial',
      mpSubscriptionId: result.id ?? null,
      amountArs: String(this.subscriptionPriceArs),
    });

    return { initPoint: result.init_point };
  }

  async getStatus(userId: string) {
    const [sub] = await this.db
      .select()
      .from(shopSubscriptions)
      .where(eq(shopSubscriptions.userId, userId))
      .orderBy(shopSubscriptions.createdAt)
      .limit(1);
    return sub ?? null;
  }

  async cancel(userId: string) {
    const [sub] = await this.db
      .select()
      .from(shopSubscriptions)
      .where(
        and(
          eq(shopSubscriptions.userId, userId),
          eq(shopSubscriptions.status, 'active'),
        ),
      )
      .limit(1);

    if (!sub) throw new NotFoundException('No active subscription found');

    if (sub.mpSubscriptionId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.preApproval.update({
          id: sub.mpSubscriptionId,
          body: { status: 'cancelled' } as any,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to cancel MP subscription ${sub.mpSubscriptionId}`,
          err,
        );
      }
    }

    await this.db
      .update(shopSubscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopSubscriptions.id, sub.id));

    await this.shopService.unpublishShop(userId);
    return { ok: true };
  }

  async handleWebhook(
    body: MpWebhookBody,
    signature?: string,
    requestId?: string,
    ts?: string,
  ) {
    if (this.webhookSecret && signature && requestId && ts) {
      this.validateSignature(body, signature, requestId, ts);
    }

    if (body.type !== 'subscription_preapproval' || !body.data?.id) return;

    const mpId = String(body.data.id);
    let preApprovalData: Awaited<ReturnType<PreApproval['get']>>;
    try {
      preApprovalData = await this.preApproval.get({ id: mpId });
    } catch (err) {
      this.logger.error(`Failed to fetch MP preapproval ${mpId}`, err);
      return;
    }

    const mpStatus = preApprovalData.status;
    const externalRef =
      (preApprovalData as { external_reference?: string }).external_reference ??
      '';
    const [userId] = externalRef.split('|');
    if (!userId) return;

    const [sub] = await this.db
      .select()
      .from(shopSubscriptions)
      .where(eq(shopSubscriptions.mpSubscriptionId, mpId))
      .limit(1);

    if (!sub) return;

    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (mpStatus === 'authorized') {
      await this.db
        .update(shopSubscriptions)
        .set({
          status: 'active',
          billingCycleStart: now,
          billingCycleEnd: nextMonth,
          nextBillingDate: nextMonth,
          updatedAt: now,
        })
        .where(eq(shopSubscriptions.id, sub.id));

      await this.db
        .update(sellerShops)
        .set({ isPublished: true, publishedAt: now, updatedAt: now })
        .where(eq(sellerShops.userId, userId));

      this.logger.log(`Shop activated for user ${userId}`);
    } else if (mpStatus === 'paused') {
      await this.db
        .update(shopSubscriptions)
        .set({ status: 'paused', updatedAt: now })
        .where(eq(shopSubscriptions.id, sub.id));
    } else if (mpStatus === 'cancelled') {
      await this.db
        .update(shopSubscriptions)
        .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
        .where(eq(shopSubscriptions.id, sub.id));
      await this.shopService.unpublishShop(userId);
      this.logger.log(`Shop unpublished — cancelled for user ${userId}`);
    }
  }

  private validateSignature(
    body: MpWebhookBody,
    signature: string,
    requestId: string,
    ts: string,
  ) {
    const parts = signature.split(',');
    const v1Part = parts.find((p) => p.startsWith('v1='));
    if (!v1Part) throw new UnauthorizedException('INVALID_WEBHOOK_SIGNATURE');
    const v1 = v1Part.replace('v1=', '');
    const dataId = body.data?.id ? String(body.data.id) : '';
    const template = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(template)
      .digest('hex');
    if (expected !== v1)
      throw new UnauthorizedException('INVALID_WEBHOOK_SIGNATURE');
  }
}
