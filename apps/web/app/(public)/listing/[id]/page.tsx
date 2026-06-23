import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_URL } from '@/lib/constants';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import type { Listing } from '@/types';
import { ListingDetailClient } from './ListingDetailClient';
import { ListingReviews } from './ListingReviews';
import { ListingQuestions } from '@/components/listing/ListingQuestions';
import {
  listingProductSchema,
  pruneUndefined,
} from '@/lib/structured-data';

async function getSellerShopSlug(username: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/shops/by-username/${username}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const shop = json?.data ?? json;
    return shop?.slug || null;
  } catch {
    return null;
  }
}

async function getListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${API_URL}/listings/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && json?.data) return json.data as Listing;
    return json as Listing;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const listing = await getListing(params.id);
  if (!listing) return { title: 'Publicación no encontrada | Tradealo' };
  const description = listing.description.slice(0, 160);
  return {
    title: `${listing.title} | Tradealo`,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: listing.images[0]?.url ? [{ url: listing.images[0].url }] : [],
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const sellerShopSlug = listing.seller?.username
    ? await getSellerShopSlug(listing.seller.username)
    : null;

  const attrs = listing.attributes ? Object.entries(listing.attributes) : [];

  const conditionLabel =
    listing.condition === 'new'
      ? 'Nuevo'
      : listing.condition === 'refurbished'
      ? 'Reacondicionado'
      : 'Usado';

  const productJsonLd = pruneUndefined(listingProductSchema(listing));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ListingDetailClient
        listing={listing}
        showPhone={listing.showPhone}
        phone={listing.phone}
        sellerUsername={listing.seller?.username}
        sellerShopSlug={sellerShopSlug}
        priceDisplay={
          <PriceDisplay
            amount={listing.price}
            currency={listing.currency}
            negotiable={listing.negotiable}
            size="lg"
          />
        }
      >
        {/* Static left-column content */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {listing.type === 'premium' && (
              <Badge variant="premium">Destacado</Badge>
            )}
            {listing.isCollectible && (
              <Badge variant="primary">Coleccionable</Badge>
            )}
            <Badge variant="default" size="sm">{conditionLabel}</Badge>
          </div>
          <h1 className="font-heading text-2xl font-bold text-tradealo-text leading-snug">
            {listing.title}
          </h1>
          <div className="mt-3">
            <PriceDisplay
              amount={listing.price}
              currency={listing.currency}
              negotiable={listing.negotiable}
              size="lg"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-tradealo-border p-5">
          <h2 className="font-heading font-semibold text-base mb-3">Descripción</h2>
          <p className="text-sm text-tradealo-text leading-relaxed whitespace-pre-wrap">
            {listing.description}
          </p>
        </div>

        {attrs.length > 0 && (
          <div className="bg-white rounded-xl border border-tradealo-border p-5">
            <h2 className="font-heading font-semibold text-base mb-3">
              Características
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {attrs.map(([key, value]) => (
                  <tr
                    key={key}
                    className="border-b border-tradealo-border last:border-0"
                  >
                    <td className="py-2 pr-4 text-tradealo-text-muted capitalize font-medium w-1/3">
                      {key}
                    </td>
                    <td className="py-2 text-tradealo-text">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-xl border border-tradealo-border p-5 space-y-4">
          {listing.paymentMethods?.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold text-sm mb-2">
                Métodos de pago
              </h3>
              <div className="flex flex-wrap gap-2">
                {listing.paymentMethods.map((m) => (
                  <Badge key={m} variant="default" size="sm">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {listing.shippingOptions?.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold text-sm mb-2">
                Opciones de envío
              </h3>
              <ul className="space-y-1">
                {listing.shippingOptions.map((s) => (
                  <li
                    key={s}
                    className="text-sm text-tradealo-text flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-tradealo-primary shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
              {listing.shippingDescription && (
                <p className="mt-2 text-xs text-tradealo-text-muted">
                  {listing.shippingDescription}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-tradealo-text-muted pt-2 border-t border-tradealo-border">
            Publicado el {formatDate(listing.createdAt)} · {listing.viewCount} vistas
          </p>
        </div>

        <ListingReviews sellerId={listing.seller?.id} />
        <ListingQuestions listingId={listing.id} sellerId={listing.seller?.id} />
      </ListingDetailClient>
    </div>
  );
}
