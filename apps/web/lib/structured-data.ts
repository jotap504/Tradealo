import { APP_URL } from './constants';
import type { Listing, PublicShop } from '@/types';

const SITE_NAME = 'Trocalia';

const CONDITION_MAP: Record<string, string> = {
  new: 'https://schema.org/NewCondition',
  used: 'https://schema.org/UsedCondition',
  refurbished: 'https://schema.org/RefurbishedCondition',
};

function absoluteUrl(path: string): string {
  const base = APP_URL.replace(/\/$/, '');
  if (path.startsWith('http')) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function listingProductSchema(listing: Listing): Record<string, unknown> {
  const url = absoluteUrl(`/listing/${listing.id}`);
  const images = (listing.images ?? []).map((i) => i.url).filter(Boolean);
  const availability =
    listing.status === 'active'
      ? 'https://schema.org/InStock'
      : listing.status === 'sold'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/Discontinued';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    image: images.length > 0 ? images : undefined,
    sku: listing.id,
    category: listing.category?.name,
    itemCondition:
      CONDITION_MAP[listing.condition] ?? 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: listing.currency,
      price: Number(listing.price).toFixed(2),
      priceValidUntil: listing.expiresAt,
      availability,
      itemCondition:
        CONDITION_MAP[listing.condition] ?? 'https://schema.org/UsedCondition',
      seller: listing.seller?.username
        ? {
            '@type': 'Person',
            name: listing.seller.username,
            url: absoluteUrl(`/seller/${listing.seller.username}`),
          }
        : undefined,
    },
  };
}

export function shopStoreSchema(shop: PublicShop): Record<string, unknown> {
  const url = absoluteUrl(`/shop/${shop.username}`);
  const itemListElements = (shop.pinnedListings ?? [])
    .filter((p) => p.listing)
    .slice(0, 10)
    .map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: absoluteUrl(`/shop/${shop.username}/listing/${p.listing!.id}`),
      name: p.listing!.title,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.shopName ?? shop.username,
    description: shop.tagline ?? shop.about ?? undefined,
    image: shop.logoUrl ?? shop.bannerUrl ?? undefined,
    url,
    address: shop.locationText
      ? {
          '@type': 'PostalAddress',
          addressLocality: shop.locationText,
          addressCountry: 'AR',
        }
      : undefined,
    parentOrganization: { '@type': 'Organization', name: SITE_NAME, url: APP_URL },
    hasOfferCatalog:
      itemListElements.length > 0
        ? {
            '@type': 'OfferCatalog',
            name: `Productos destacados de ${shop.shopName ?? shop.username}`,
            itemListElement: itemListElements,
          }
        : undefined,
  };
}

/**
 * Strips undefined values from an object recursively so the serialized JSON
 * stays clean (Google's validator complains about `"key": undefined` artifacts).
 */
export function pruneUndefined<T>(input: T): T {
  if (Array.isArray(input)) {
    return input
      .filter((v) => v !== undefined)
      .map((v) => pruneUndefined(v)) as unknown as T;
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = pruneUndefined(v);
    }
    return out as unknown as T;
  }
  return input;
}
