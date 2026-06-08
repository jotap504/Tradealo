import { Logger } from '@nestjs/common';
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import type { ListingsService } from '../listings/listings.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { StorageService } from '../storage/storage.service';
import type { ColumnMapping, TrocaliaField } from './excel-ai-mapper.service';

type DB = NodePgDatabase<typeof schema>;

const PROVIDER = 'excel';
const log = new Logger('ExcelImportProcessor');

export interface ExcelImportDeps {
  db: DB;
  listings: ListingsService;
  notifications: NotificationsService;
  storage: StorageService;
}

interface JobOptions {
  filename?: string;
  headers?: string[];
  rows?: (string | number | null)[][];
  mapping?: ColumnMapping[];
  confirmed?: boolean;
}

export async function processExcelImport(
  jobId: string,
  deps: ExcelImportDeps,
): Promise<void> {
  const { db } = deps;

  const [row] = await db
    .select()
    .from(schema.importJobs)
    .where(eq(schema.importJobs.id, jobId))
    .limit(1);
  if (!row) {
    log.warn(`Excel job ${jobId} not found`);
    return;
  }
  const opts = (row.options ?? {}) as JobOptions;
  const rows = opts.rows ?? [];
  const mapping = opts.mapping ?? [];

  await db
    .update(schema.importJobs)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(schema.importJobs.id, jobId));

  try {
    const candidates = await db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(
        or(
          isNull(schema.categories.isActive),
          eq(schema.categories.isActive, true),
        ),
      );

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

    for (const item of pending) {
      try {
        const tail = item.externalProductId.split('-').pop() ?? '';
        const rowIndex = Number(tail);
        const raw = !Number.isNaN(rowIndex) ? rows[rowIndex] : undefined;
        if (!raw) throw new Error('Row not found in options payload');

        const data = extractFields(raw, mapping);

        if (!data.title || data.title.length < 5) {
          throw new Error('TITLE_TOO_SHORT');
        }
        if (!data.description || data.description.length < 20) {
          data.description =
            (data.description || data.title) +
            ' — Importado desde Excel. Editá la descripción antes de publicar.';
        }
        if (data.price == null || Number.isNaN(data.price)) {
          throw new Error('PRICE_MISSING');
        }

        const exists = await db
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
        if (exists.length > 0) {
          await db
            .update(schema.importJobItems)
            .set({
              status: 'skipped',
              listingId: exists[0]!.id,
              updatedAt: new Date(),
            })
            .where(eq(schema.importJobItems.id, item.id));
          skipped += 1;
          continue;
        }

        const categoryId =
          (data.categoryHint &&
            pickCategoryByHint(data.categoryHint, candidates)) ||
          (await pickFallbackCategory(db, row.userId, candidates));
        if (!categoryId) {
          throw new Error('NO_CATEGORY');
        }

        const listing = await deps.listings.createDraftFromImport(
          row.userId,
          {
            categoryId,
            title: data.title.slice(0, 150),
            description: data.description.slice(0, 5000),
            price: data.price,
            currency: data.currency,
            priceNegotiable: false,
            condition: data.condition,
            paymentMethods: ['mercadopago'],
            shippingOptions: [],
            saleType: 'contact',
            stock: data.stock ?? undefined,
          } as unknown as Parameters<
            ListingsService['createDraftFromImport']
          >[1],
          { provider: PROVIDER, externalProductId: item.externalProductId },
        );

        for (let i = 0; i < data.imagesUrls.length && i < 8; i += 1) {
          try {
            await downloadAndStoreImage(
              listing.id,
              data.imagesUrls[i],
              i,
              i === 0,
              deps.storage,
              db,
            );
          } catch (err) {
            log.warn(
              `Image failed row=${rowIndex} url=${data.imagesUrls[i]}: ${(err as Error).message}`,
            );
          }
        }

        await db
          .update(schema.importJobItems)
          .set({
            status: 'created',
            listingId: listing.id,
            rawPayload: { row: raw } as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(schema.importJobItems.id, item.id));
        succeeded += 1;
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        log.warn(`Excel row ${item.externalProductId} failed: ${msg}`);
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
        title: 'Importación Excel finalizada',
        body: `Se importaron ${succeeded} productos. Revisá tus borradores.`,
        link: '/my-listings?status=draft',
      } as unknown as Parameters<NotificationsService['send']>[0]);
    } catch {
      /* ignore */
    }
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    log.error(`Excel job ${jobId} crashed: ${msg}`);
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

interface ExtractedRow {
  title: string;
  description: string;
  price: number;
  currency: 'ARS' | 'USD';
  condition: 'new' | 'used' | 'refurbished';
  categoryHint: string | null;
  imagesUrls: string[];
  stock: number | null;
}

function extractFields(
  row: (string | number | null)[],
  mapping: ColumnMapping[],
): ExtractedRow {
  const get = (field: TrocaliaField): string => {
    const col = mapping.find((m) => m.field === field);
    if (!col) return '';
    const v = row[col.index];
    return v == null ? '' : String(v).trim();
  };

  const title = get('title');
  const description = get('description');
  const priceRaw = get('price').replace(/[^\d.,-]/g, '').replace(',', '.');
  const price = priceRaw ? Number(priceRaw) : NaN;
  const currencyRaw = get('currency').toUpperCase();
  const currency: 'ARS' | 'USD' = currencyRaw === 'USD' ? 'USD' : 'ARS';
  const conditionRaw = get('condition').toLowerCase();
  const condition: 'new' | 'used' | 'refurbished' = /(nuevo|new)/.test(
    conditionRaw,
  )
    ? 'new'
    : /(refurb|reacond|restaur)/.test(conditionRaw)
      ? 'refurbished'
      : 'used';
  const categoryHint = get('categoryHint') || null;
  const imagesRaw = get('imagesUrls');
  const imagesUrls = imagesRaw
    ? imagesRaw
        .split(/[|,\n;]/)
        .map((s) => s.trim())
        .filter((s) => /^https?:\/\//.test(s))
    : [];
  const stockRaw = get('stock');
  const stockNum = stockRaw ? Number(stockRaw.replace(/[^\d]/g, '')) : null;

  return {
    title,
    description,
    price,
    currency,
    condition,
    categoryHint,
    imagesUrls,
    stock: stockNum == null || Number.isNaN(stockNum) ? null : stockNum,
  };
}

function pickCategoryByHint(
  hint: string,
  candidates: { id: string; name: string }[],
): string | null {
  const norm = hint.toLowerCase();
  let best: { id: string; score: number } | null = null;
  for (const c of candidates) {
    const cn = c.name.toLowerCase();
    let score = 0;
    if (cn === norm) score = 100;
    else if (cn.includes(norm) || norm.includes(cn)) score = 50;
    else {
      const words = norm.split(/\s+/);
      score = words.reduce(
        (n, w) => (w.length >= 3 && cn.includes(w) ? n + 1 : n),
        0,
      );
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: c.id, score };
    }
  }
  return best?.id ?? null;
}

async function pickFallbackCategory(
  db: DB,
  userId: string,
  candidates: { id: string; name: string }[],
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

async function downloadAndStoreImage(
  listingId: string,
  url: string,
  sortOrder: number,
  isPrimary: boolean,
  storage: StorageService,
  db: DB,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = (res.headers.get('content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(contentType)) {
    throw new Error(`bad content-type ${contentType}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) throw new Error('too large');
  const ext =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/webp'
        ? 'webp'
        : 'jpg';
  const key = `listings/${listingId}/${Date.now()}-${sortOrder}.${ext}`;
  const publicUrl = await storage.uploadBuffer(key, buf, contentType);
  await db.insert(schema.listingImages).values({
    listingId,
    url: publicUrl,
    r2Key: key,
    sortOrder,
    isPrimary,
  });
}
