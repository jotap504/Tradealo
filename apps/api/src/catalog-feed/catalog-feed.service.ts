import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import {
  listings as listingsTable,
  listingImages,
  sellerShops,
  shopSubscriptions,
  users,
  userProfiles,
} from '../database/schema';

type DB = NodePgDatabase<typeof schema>;

const SITE_URL = process.env.APP_URL ?? 'https://trocalia.com.ar';
const SITE_NAME = 'Trocalia';
const FEED_PAGE_SIZE = 500;

const CONDITION_SCHEMA: Record<string, string> = {
  new: 'https://schema.org/NewCondition',
  used: 'https://schema.org/UsedCondition',
  refurbished: 'https://schema.org/RefurbishedCondition',
};

const CONDITION_MERCHANT: Record<string, string> = {
  new: 'new',
  used: 'used',
  refurbished: 'refurbished',
};

export interface FeedProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  condition: string;
  url: string;
  imageUrl: string | null;
  category: string | null;
  city: string | null;
  province: string | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
  agentPurchasable: boolean;
}

@Injectable()
export class CatalogFeedService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async getActiveListings(cursor?: string): Promise<{
    items: FeedProduct[];
    nextCursor: string | null;
  }> {
    const conditions = [
      eq(listingsTable.status, 'active'),
      eq(listingsTable.moderationStatus, 'approved' as string),
    ];
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      if (decoded) conditions.push(lt(listingsTable.createdAt, decoded));
    }

    const rows = await this.db
      .select({
        id: listingsTable.id,
        title: listingsTable.title,
        description: listingsTable.description,
        price: listingsTable.price,
        currency: listingsTable.currency,
        condition: listingsTable.condition,
        city: listingsTable.city,
        province: listingsTable.province,
        publishedAt: listingsTable.publishedAt,
        updatedAt: listingsTable.updatedAt,
        createdAt: listingsTable.createdAt,
        agentPurchasable: listingsTable.agentPurchasable,
        categoryName: schema.categories.name,
      })
      .from(listingsTable)
      .leftJoin(
        schema.categories,
        eq(listingsTable.categoryId, schema.categories.id),
      )
      .where(and(...conditions))
      .orderBy(desc(listingsTable.createdAt))
      .limit(FEED_PAGE_SIZE + 1);

    const hasNext = rows.length > FEED_PAGE_SIZE;
    const slice = rows.slice(0, FEED_PAGE_SIZE);

    const ids = slice.map((r) => r.id);
    const imagesById =
      ids.length > 0
        ? await this.fetchPrimaryImages(ids)
        : new Map<string, string>();

    const items: FeedProduct[] = slice.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      price: r.price,
      currency: r.currency,
      condition: r.condition,
      url: `${SITE_URL}/listing/${r.id}`,
      imageUrl: imagesById.get(r.id) ?? null,
      category: r.categoryName,
      city: r.city,
      province: r.province,
      publishedAt: r.publishedAt,
      updatedAt: r.updatedAt,
      agentPurchasable: r.agentPurchasable,
    }));

    const lastCreatedAt = slice[slice.length - 1]?.createdAt ?? null;
    const nextCursor =
      hasNext && lastCreatedAt ? this.encodeCursor(lastCreatedAt) : null;
    return { items, nextCursor };
  }

  async getActiveShops() {
    const rows = await this.db
      .select({
        slug: sellerShops.slug,
        shopName: sellerShops.shopName,
        tagline: sellerShops.tagline,
        logoUrl: sellerShops.logoUrl,
        username: userProfiles.username,
      })
      .from(sellerShops)
      .innerJoin(
        shopSubscriptions,
        and(
          eq(shopSubscriptions.shopId, sellerShops.id),
          eq(shopSubscriptions.status, 'active'),
        ),
      )
      .innerJoin(users, eq(users.id, sellerShops.userId))
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(sellerShops.isPublished, true));

    return rows.map((r) => ({
      slug: r.slug,
      username: r.username,
      shopName: r.shopName,
      tagline: r.tagline,
      logoUrl: r.logoUrl,
      url: `${SITE_URL}/shop/${r.username ?? r.slug ?? ''}`,
    }));
  }

  // ─── Formatters ───────────────────────────────────────────────────────────

  productsToJsonLd(items: FeedProduct[], nextCursor: string | null) {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${SITE_NAME} — Catálogo de productos`,
      url: `${SITE_URL}/listings`,
      numberOfItems: items.length,
      nextPage: nextCursor
        ? `${SITE_URL}/api/v1/feed/products.json?cursor=${encodeURIComponent(nextCursor)}`
        : null,
      itemListElement: items.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: p.url,
        item: {
          '@type': 'Product',
          name: p.title,
          description: p.description,
          image: p.imageUrl ?? undefined,
          sku: p.id,
          category: p.category ?? undefined,
          itemCondition:
            CONDITION_SCHEMA[p.condition] ?? 'https://schema.org/UsedCondition',
          offers: {
            '@type': 'Offer',
            url: p.url,
            priceCurrency: p.currency,
            price: Number(p.price).toFixed(2),
            availability: 'https://schema.org/InStock',
            itemCondition:
              CONDITION_SCHEMA[p.condition] ??
              'https://schema.org/UsedCondition',
            areaServed: { '@type': 'Country', name: 'Argentina' },
            additionalProperty: [
              {
                '@type': 'PropertyValue',
                name: 'agentPayment',
                value: p.agentPurchasable ? 'yes' : 'no',
              },
            ],
          },
        },
      })),
    };
  }

  productsToGoogleMerchantXml(items: FeedProduct[]): string {
    const itemsXml = items
      .map((p) => {
        const condition = CONDITION_MERCHANT[p.condition] ?? 'used';
        return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(p.description.slice(0, 5000))}</g:description>
      <g:link>${escapeXml(p.url)}</g:link>
      ${p.imageUrl ? `<g:image_link>${escapeXml(p.imageUrl)}</g:image_link>` : ''}
      <g:condition>${condition}</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${Number(p.price).toFixed(2)} ${escapeXml(p.currency)}</g:price>
      ${p.category ? `<g:product_type>${escapeXml(p.category)}</g:product_type>` : ''}
      ${p.city ? `<g:item_group_id>${escapeXml(p.city)}</g:item_group_id>` : ''}
      <g:agent_payment>${p.agentPurchasable ? 'yes' : 'no'}</g:agent_payment>
    </item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>Catálogo de Trocalia — marketplace de Argentina</description>
${itemsXml}
  </channel>
</rss>`;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async fetchPrimaryImages(
    listingIds: string[],
  ): Promise<Map<string, string>> {
    if (listingIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        listingId: listingImages.listingId,
        url: listingImages.url,
        isPrimary: listingImages.isPrimary,
        sortOrder: listingImages.sortOrder,
      })
      .from(listingImages)
      .where(inArray(listingImages.listingId, listingIds));

    const byListing = new Map<string, string>();
    for (const r of rows) {
      const existing = byListing.get(r.listingId);
      if (!existing || r.isPrimary) {
        byListing.set(r.listingId, r.url);
      }
    }
    return byListing;
  }

  private encodeCursor(date: Date): string {
    return Buffer.from(date.toISOString()).toString('base64url');
  }

  private decodeCursor(cursor: string): Date | null {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const d = new Date(decoded);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
