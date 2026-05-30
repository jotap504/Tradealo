import type { PublicShop, Listing } from '@/types';
import { APP_URL } from '@/lib/constants';

function buildSameAs(social: PublicShop['socialLinks']): string[] {
  if (!social) return [];
  const map: Record<string, string> = {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    tiktok: 'https://tiktok.com/@',
    youtube: 'https://youtube.com/@',
    twitter: 'https://twitter.com/',
    website: '',
  };
  return Object.entries(map)
    .filter(([key]) => social[key as keyof typeof social])
    .map(([key, prefix]) => {
      const handle = social[key as keyof typeof social] as string;
      return key === 'website' ? handle : `${prefix}${handle.replace(/^@/, '')}`;
    });
}

function shopSchema(shop: PublicShop) {
  const image = shop.ogImageUrl ?? shop.bannerUrl ?? shop.logoUrl ?? undefined;
  const sameAs = buildSameAs(shop.socialLinks);
  const shopUrl = `${APP_URL}/shop/${shop.username ?? shop.slug}`;

  const itemListElements = (shop.pinnedListings ?? [])
    .filter((p) => p.listing)
    .slice(0, 10)
    .map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${shopUrl}/listing/${p.listing!.id}`,
      name: p.listing!.title,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.shopName ?? shop.username,
    description: shop.metaDescription ?? shop.tagline ?? shop.about?.slice(0, 160) ?? undefined,
    url: shopUrl,
    image,
    telephone: shop.whatsappBusiness ?? undefined,
    address: shop.locationText
      ? { '@type': 'PostalAddress', addressLocality: shop.locationText, addressCountry: 'AR' }
      : undefined,
    parentOrganization: { '@type': 'Organization', name: 'Trocalia', url: APP_URL },
    ...(sameAs.length > 0 && { sameAs }),
    ...(itemListElements.length > 0 && {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: `Productos destacados de ${shop.shopName ?? shop.username}`,
        itemListElement: itemListElements,
      },
    }),
  };
}

function productSchema(shop: PublicShop, listing: Listing) {
  const CONDITION_MAP: Record<string, string> = {
    new: 'https://schema.org/NewCondition',
    used: 'https://schema.org/UsedCondition',
    refurbished: 'https://schema.org/RefurbishedCondition',
  };
  const image =
    (listing.images as Array<{ url: string }> | undefined)?.[0]?.url ?? undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description?.slice(0, 500) ?? undefined,
    image,
    url: `${APP_URL}/shop/${shop.username ?? shop.slug}/listing/${listing.id}`,
    brand: shop.shopName ? { '@type': 'Brand', name: shop.shopName } : undefined,
    offers: {
      '@type': 'Offer',
      price: listing.price ?? 0,
      priceCurrency: listing.currency ?? 'ARS',
      availability: 'https://schema.org/InStock',
      itemCondition: CONDITION_MAP[listing.condition] ?? 'https://schema.org/UsedCondition',
      seller: shop.shopName
        ? { '@type': 'Organization', name: shop.shopName }
        : undefined,
    },
  };
}

export function ShopJsonLd({ shop }: { shop: PublicShop }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(shopSchema(shop)) }}
    />
  );
}

export function ProductJsonLd({ shop, listing }: { shop: PublicShop; listing: Listing }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema(shop, listing)) }}
    />
  );
}
