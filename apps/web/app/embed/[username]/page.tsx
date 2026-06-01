import { notFound } from 'next/navigation';
import Image from 'next/image';
import { API_URL, APP_URL } from '@/lib/constants';
import type { PublicShop } from '@/types';

export const revalidate = 60;

interface Props {
  params: { username: string };
}

async function getShop(username: string): Promise<PublicShop | null> {
  try {
    const res = await fetch(`${API_URL}/shops/by-username/${username}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as PublicShop;
  } catch {
    return null;
  }
}

export default async function EmbedPage({ params }: Props) {
  const shop = await getShop(params.username);
  if (!shop) notFound();

  const pinned = (shop.pinnedListings ?? [])
    .filter((p) => p.listing)
    .slice(0, 6);
  const shopUrl = `${APP_URL.replace(/\/$/, '')}/shop/${shop.username ?? shop.slug ?? params.username}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-3 space-y-3">
        <a
          href={shopUrl}
          target="_top"
          className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:bg-gray-50 transition-colors"
        >
          {shop.logoUrl && (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
              <Image
                src={shop.logoUrl}
                alt={shop.shopName ?? ''}
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-gray-900 truncate">
              {shop.shopName ?? shop.username}
            </p>
            {shop.tagline && (
              <p className="text-xs text-gray-500 truncate">{shop.tagline}</p>
            )}
          </div>
          <span className="text-xs font-medium text-teal-600 shrink-0">
            Ver en Trocalia →
          </span>
        </a>

        {pinned.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pinned.map((p) => {
              const l = p.listing!;
              const img = l.primaryImageUrl;
              return (
                <a
                  key={l.id}
                  href={`${shopUrl}/listing/${l.id}`}
                  target="_top"
                  className="rounded-xl border bg-white overflow-hidden hover:shadow transition-shadow"
                >
                  <div className="aspect-square bg-gray-100 relative">
                    {img && (
                      <Image
                        src={img}
                        alt={l.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2rem]">
                      {l.title}
                    </p>
                    <p className="text-sm font-semibold text-teal-600 mt-1">
                      {l.currency} {Number(l.price).toLocaleString('es-AR')}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500 py-8">
            Esta tienda todavía no tiene productos destacados.
          </p>
        )}

        <p className="text-center text-[10px] text-gray-400 pt-1">
          Powered by{' '}
          <a
            href={APP_URL}
            target="_top"
            className="hover:underline text-gray-500"
          >
            Trocalia
          </a>
        </p>
      </div>
    </div>
  );
}
