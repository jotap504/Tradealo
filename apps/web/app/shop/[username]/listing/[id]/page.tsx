import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { shop as shopApi } from '@/lib/api';
import ShopThemeProvider from '@/components/shop/ShopThemeProvider';
import ShopNav from '@/components/shop/ShopNav';
import ChatbotWidget from '@/components/shop/ChatbotWidget';
import FloatingWhatsApp from '@/components/shop/FloatingWhatsApp';
import ShopFooter from '@/components/shop/ShopFooter';
import { API_URL } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { Listing } from '@/types';

export const revalidate = 60;

async function getListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${API_URL}/listings/${id}`, { next: { revalidate: 60 } });
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
  params: { username: string; id: string };
}): Promise<Metadata> {
  try {
    const [shopData, listing] = await Promise.all([
      shopApi.getPublic(params.username),
      getListing(params.id),
    ]);
    return {
      title: listing?.title
        ? `${listing.title} — ${shopData.shopName ?? params.username}`
        : shopData.shopName ?? params.username,
      description: listing?.description?.slice(0, 160) ?? undefined,
    };
  } catch {
    return { title: params.username };
  }
}

const CONDITION_LABEL: Record<string, string> = {
  new: 'Nuevo',
  used: 'Usado',
  refurbished: 'Reacondicionado',
};

function formatPrice(price: number, currency: string): string {
  const symbol = currency === 'USD' ? 'U$D' : '$';
  return `${symbol} ${price.toLocaleString('es-AR')}`;
}

export default async function ShopListingPage({
  params,
}: {
  params: { username: string; id: string };
}) {
  let shopData;
  try {
    shopData = await shopApi.getPublic(params.username);
  } catch {
    notFound();
  }

  const listing = await getListing(params.id);
  if (!listing) notFound();

  const resolvedUsername = shopData.username ?? params.username;
  const conditionLabel = CONDITION_LABEL[listing.condition] ?? listing.condition;
  const attrs = listing.attributes ? Object.entries(listing.attributes) : [];

  const whatsappNumber = shopData.whatsappBusiness ?? listing.phone ?? '';
  const whatsappMessage = encodeURIComponent(
    `Hola! Vi este producto en tu tienda: ${listing.title}. ¿Está disponible?`,
  );
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${whatsappMessage}`
    : null;

  return (
    <ShopThemeProvider theme={shopData.theme}>
      <div
        style={{
          backgroundColor: 'var(--shop-bg)',
          fontFamily: 'var(--shop-font)',
          minHeight: '100vh',
        }}
      >
        <ShopNav
          shopName={shopData.shopName}
          logoUrl={shopData.logoUrl}
          username={resolvedUsername}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          {/* Breadcrumb */}
          <Link
            href={`/shop/${resolvedUsername}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
            style={{ color: 'var(--shop-primary)' }}
          >
            <ChevronLeft size={16} />
            Volver a la tienda
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Images */}
            <div className="lg:w-[55%] shrink-0">
              {listing.images && listing.images.length > 0 ? (
                <div className="space-y-3">
                  <div
                    className="relative w-full rounded-2xl overflow-hidden"
                    style={{
                      aspectRatio: '4/3',
                      backgroundColor: 'var(--shop-surface)',
                      border: '1px solid var(--shop-border)',
                    }}
                  >
                    <Image
                      src={listing.images[0].url}
                      alt={listing.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      priority
                    />
                  </div>
                  {listing.images.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {listing.images.slice(1).map((img) => (
                        <div
                          key={img.id}
                          className="relative rounded-xl overflow-hidden shrink-0"
                          style={{
                            width: 72,
                            height: 72,
                            border: '1px solid var(--shop-border)',
                            backgroundColor: 'var(--shop-surface)',
                          }}
                        >
                          <Image
                            src={img.url}
                            alt={listing.title}
                            fill
                            className="object-cover"
                            sizes="72px"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="w-full rounded-2xl flex items-center justify-center text-6xl"
                  style={{
                    aspectRatio: '4/3',
                    backgroundColor: 'var(--shop-surface)',
                    border: '1px solid var(--shop-border)',
                  }}
                >
                  📦
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-5">
              <div>
                <span
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3"
                  style={{ backgroundColor: 'var(--shop-primary)', color: '#fff' }}
                >
                  {conditionLabel}
                </span>
                <h1
                  className="text-2xl font-bold leading-snug"
                  style={{ color: 'var(--shop-text)' }}
                >
                  {listing.title}
                </h1>
              </div>

              <div>
                <p
                  className="text-3xl font-extrabold"
                  style={{ color: 'var(--shop-primary)' }}
                >
                  {formatPrice(listing.price, listing.currency)}
                </p>
                {listing.negotiable && (
                  <p className="text-sm mt-1" style={{ color: 'var(--shop-text-muted)' }}>
                    Precio negociable
                  </p>
                )}
              </div>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 w-full justify-center"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  <MessageCircle size={18} />
                  Consultar por WhatsApp
                </a>
              )}

              {listing.description && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: 'var(--shop-surface)',
                    border: '1px solid var(--shop-border)',
                  }}
                >
                  <h2
                    className="font-semibold text-sm mb-2"
                    style={{ color: 'var(--shop-text)' }}
                  >
                    Descripción
                  </h2>
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--shop-text-muted)' }}
                  >
                    {listing.description}
                  </p>
                </div>
              )}

              {attrs.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: 'var(--shop-surface)',
                    border: '1px solid var(--shop-border)',
                  }}
                >
                  <h2
                    className="font-semibold text-sm mb-3"
                    style={{ color: 'var(--shop-text)' }}
                  >
                    Características
                  </h2>
                  <table className="w-full text-sm">
                    <tbody>
                      {attrs.map(([key, value]) => (
                        <tr
                          key={key}
                          className="border-b last:border-0"
                          style={{ borderColor: 'var(--shop-border)' }}
                        >
                          <td
                            className="py-2 pr-4 font-medium capitalize w-1/3"
                            style={{ color: 'var(--shop-text-muted)' }}
                          >
                            {key}
                          </td>
                          <td className="py-2" style={{ color: 'var(--shop-text)' }}>
                            {String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {((listing.paymentMethods?.length ?? 0) > 0 ||
                (listing.shippingOptions?.length ?? 0) > 0) && (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    backgroundColor: 'var(--shop-surface)',
                    border: '1px solid var(--shop-border)',
                  }}
                >
                  {listing.paymentMethods?.length > 0 && (
                    <div>
                      <h3
                        className="font-semibold text-sm mb-2"
                        style={{ color: 'var(--shop-text)' }}
                      >
                        Métodos de pago
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {listing.paymentMethods.map((m) => (
                          <span
                            key={m}
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{
                              backgroundColor: 'var(--shop-border)',
                              color: 'var(--shop-text)',
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {listing.shippingOptions?.length > 0 && (
                    <div>
                      <h3
                        className="font-semibold text-sm mb-2"
                        style={{ color: 'var(--shop-text)' }}
                      >
                        Envío
                      </h3>
                      <ul className="space-y-1">
                        {listing.shippingOptions.map((s) => (
                          <li
                            key={s}
                            className="text-sm flex items-center gap-2"
                            style={{ color: 'var(--shop-text-muted)' }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: 'var(--shop-primary)' }}
                            />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs" style={{ color: 'var(--shop-text-muted)' }}>
                Publicado el {formatDate(listing.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <ChatbotWidget
          shopId={shopData.id}
          shopName={shopData.shopName}
          whatsappNumber={shopData.whatsappBusiness}
        />
        <FloatingWhatsApp
          phoneNumber={shopData.whatsappBusiness ?? ''}
          shopName={shopData.shopName}
        />

        <ShopFooter shop={shopData} />
      </div>
    </ShopThemeProvider>
  );
}
