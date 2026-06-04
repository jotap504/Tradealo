import type { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import type { MercadolibreApiClient } from '../../mercadolibre/mercadolibre-api.client';
import type { MercadolibreOauthService } from '../../mercadolibre/mercadolibre-oauth.service';
import type { MlImageService } from '../../mercadolibre/ml-image.service';
import type {
  MlAiDrafterService,
  CandidateCategory,
} from '../../mercadolibre/ml-ai-drafter.service';
import type { ListingsService } from '../../listings/listings.service';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { MlImportJobData } from '../jobs.service';

type DB = NodePgDatabase<typeof schema>;

const PROVIDER = 'mercadolibre';

export interface MlImportDeps {
  db: DB;
  oauth: MercadolibreOauthService;
  api: MercadolibreApiClient;
  imageService: MlImageService;
  drafter: MlAiDrafterService;
  listings: ListingsService;
  notifications: NotificationsService;
}

const log = new Logger('MlImportProcessor');

export async function processMlImport(
  job: Job<MlImportJobData>,
  deps: MlImportDeps,
): Promise<void> {
  const { jobId } = job.data;
  const { db } = deps;

  const [row] = await db
    .select()
    .from(schema.importJobs)
    .where(eq(schema.importJobs.id, jobId))
    .limit(1);
  if (!row) {
    log.warn(`Import job ${jobId} not found`);
    return;
  }

  await db
    .update(schema.importJobs)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(schema.importJobs.id, jobId));

  try {
    const accessToken = await deps.oauth.getAccessToken(row.userId);

    const pending = await db
      .select()
      .from(schema.importJobItems)
      .where(
        and(
          eq(schema.importJobItems.jobId, jobId),
          eq(schema.importJobItems.status, 'pending'),
        ),
      );

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    const candidates = await buildCategoryShortlist(db);

    for (const item of pending) {
      try {
        const existing = await db
          .select({ id: schema.listings.id })
          .from(schema.listings)
          .where(
            and(
              eq(schema.listings.userId, row.userId),
              eq(schema.listings.sourceProvider, PROVIDER),
              eq(schema.listings.sourceProductId, item.externalProductId),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(schema.importJobItems)
            .set({
              status: 'skipped',
              listingId: existing[0]!.id,
              updatedAt: new Date(),
            })
            .where(eq(schema.importJobItems.id, item.id));
          skipped += 1;
          continue;
        }

        const [mlItem] = await deps.api.getItemsBatch(
          [item.externalProductId],
          accessToken,
        );
        if (!mlItem) throw new Error('ML item not found');
        const description = await deps.api.getItemDescription(
          item.externalProductId,
          accessToken,
        );

        const shortlist = filterCandidates(candidates, mlItem.title);
        const drafted = await deps.drafter.draftListingCopy(
          mlItem,
          description,
          shortlist,
        );

        const categoryId =
          drafted.suggestedCategoryId ??
          (await pickFallbackCategory(db, row.userId, candidates));
        if (!categoryId) {
          throw new Error(
            'No suitable category found and no fallback available',
          );
        }

        const listing = await deps.listings.createDraftFromImport(
          row.userId,
          {
            categoryId,
            title: drafted.title,
            description: drafted.description,
            price: drafted.priceArs,
            currency: drafted.currency,
            priceNegotiable: false,
            condition: spanishConditionToEnum(drafted.condition),
            paymentMethods: drafted.paymentMethods,
            shippingOptions: [],
            saleType: 'contact',
          } as unknown as Parameters<
            ListingsService['createDraftFromImport']
          >[1],
          {
            provider: PROVIDER,
            externalProductId: item.externalProductId,
          },
        );

        const pics = (mlItem.pictures ?? []).slice(0, 8);
        let idx = 0;
        for (const pic of pics) {
          try {
            await deps.imageService.downloadAndStore(
              listing.id,
              pic.secure_url ?? pic.url,
              idx,
              idx === 0,
            );
          } catch (err) {
            log.warn(
              `Image failed for ${item.externalProductId}: ${(err as Error).message}`,
            );
          }
          idx += 1;
        }

        await db
          .update(schema.importJobItems)
          .set({
            status: 'created',
            listingId: listing.id,
            rawPayload: mlItem as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(schema.importJobItems.id, item.id));
        succeeded += 1;
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        log.warn(`Item ${item.externalProductId} failed: ${msg}`);
        await db
          .update(schema.importJobItems)
          .set({
            status: 'failed',
            errorMessage: msg.slice(0, 500),
            updatedAt: new Date(),
          })
          .where(eq(schema.importJobItems.id, item.id));
        failed += 1;
      }
    }

    await db
      .update(schema.importJobs)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        succeeded: sql`${schema.importJobs.succeeded} + ${succeeded}`,
        failed: sql`${schema.importJobs.failed} + ${failed}`,
        skippedDuplicate: sql`${schema.importJobs.skippedDuplicate} + ${skipped}`,
      })
      .where(eq(schema.importJobs.id, jobId));

    try {
      await deps.notifications.send({
        userId: row.userId,
        type: 'default',
        title: 'Importación finalizada',
        body: `Se importaron ${succeeded} productos desde MercadoLibre. Revisá tus borradores.`,
        link: '/my-listings?status=draft',
      } as unknown as Parameters<NotificationsService['send']>[0]);
    } catch (err) {
      log.warn(`Notification send failed: ${(err as Error).message}`);
    }
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    log.error(`Job ${jobId} failed: ${msg}`);
    await db
      .update(schema.importJobs)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: msg.slice(0, 500),
      })
      .where(eq(schema.importJobs.id, jobId));
  }
}

function spanishConditionToEnum(c: string): 'new' | 'used' | 'refurbished' {
  if (c === 'nuevo') return 'new';
  if (c === 'reacondicionado') return 'refurbished';
  return 'used';
}

async function buildCategoryShortlist(db: DB): Promise<CandidateCategory[]> {
  const rows = await db
    .select({ id: schema.categories.id, name: schema.categories.name })
    .from(schema.categories)
    .where(
      or(
        isNull(schema.categories.isActive),
        eq(schema.categories.isActive, true),
      ),
    )
    .limit(300);
  return rows;
}

function filterCandidates(
  candidates: CandidateCategory[],
  mlTitle: string,
): CandidateCategory[] {
  const words = mlTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  if (words.length === 0) return candidates.slice(0, 10);
  const scored = candidates
    .map((c) => {
      const lower = c.name.toLowerCase();
      const hits = words.reduce((n, w) => (lower.includes(w) ? n + 1 : n), 0);
      return { c, hits };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((s) => s.c);
  return scored.length > 0 ? scored.slice(0, 10) : candidates.slice(0, 10);
}

async function pickFallbackCategory(
  db: DB,
  userId: string,
  candidates: CandidateCategory[],
): Promise<string | null> {
  const [mostUsed] = await db
    .select({
      categoryId: schema.listings.categoryId,
      cnt: sql<number>`count(*)`,
    })
    .from(schema.listings)
    .where(eq(schema.listings.userId, userId))
    .groupBy(schema.listings.categoryId)
    .orderBy(sql`count(*) desc`)
    .limit(1);
  if (mostUsed?.categoryId) return mostUsed.categoryId;

  const [otros] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(ilike(schema.categories.name, '%otros%'))
    .limit(1);
  if (otros) return otros.id;

  return candidates[0]?.id ?? null;
}
