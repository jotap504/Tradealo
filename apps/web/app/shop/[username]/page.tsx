import { notFound } from 'next/navigation';
import Image from 'next/image';
import { shop as shopApi } from '@/lib/api';
import ShopHeader from '@/components/shop/ShopHeader';
import ShopAnnouncement from '@/components/shop/ShopAnnouncement';
import ShopGallery from '@/components/shop/ShopGallery';
import ShopAnalyticsTracker from '@/components/shop/ShopAnalyticsTracker';
import ChatbotWidget from '@/components/shop/ChatbotWidget';

export const revalidate = 60;

interface Props {
  params: { username: string };
}

export default async function ShopPage({ params }: Props) {
  let shopData;
  try {
    shopData = await shopApi.getPublic(params.username);
  } catch {
    notFound();
  }

  const currency = (c: string) => (c === 'USD' ? 'U$D' : '$');

  return (
    <>
      <ShopAnalyticsTracker shopId={shopData.id} />

      <ShopAnnouncement
        shopId={shopData.id}
        text={shopData.announcementText}
        expiresAt={shopData.announcementExpiresAt}
      />

      <ShopHeader shop={shopData} />

      {shopData.pinnedListings.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--shop-text)' }}>
            Destacados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {shopData.pinnedListings.map(({ listing }) => (
              <a
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="rounded-xl overflow-hidden border transition-shadow hover:shadow-md"
                style={{ borderColor: 'var(--shop-border)', backgroundColor: 'var(--shop-surface)' }}
              >
                <div className="relative aspect-square">
                  {listing.primaryImageUrl ? (
                    <Image src={listing.primaryImageUrl} alt={listing.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl" style={{ backgroundColor: 'var(--shop-border)' }}>
                      📦
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--shop-text)' }}>{listing.title}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--shop-primary)' }}>
                    {currency(listing.currency)} {Number(listing.price).toLocaleString('es-AR')}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <ShopGallery images={shopData.galleryImages} />

      {shopData.allListings.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--shop-text)' }}>
            Todos los productos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {shopData.allListings.map((listing) => (
              <a
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="rounded-xl overflow-hidden border transition-shadow hover:shadow-md"
                style={{ borderColor: 'var(--shop-border)', backgroundColor: 'var(--shop-surface)' }}
              >
                <div className="relative aspect-square">
                  {listing.primaryImageUrl ? (
                    <Image src={listing.primaryImageUrl} alt={listing.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl" style={{ backgroundColor: 'var(--shop-border)' }}>
                      📦
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--shop-text)' }}>{listing.title}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--shop-primary)' }}>
                    {currency(listing.currency)} {Number(listing.price).toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs capitalize" style={{ color: 'var(--shop-text-muted)' }}>{listing.condition}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <ChatbotWidget
        shopId={shopData.id}
        shopName={shopData.shopName}
        whatsappNumber={shopData.whatsappBusiness}
      />
    </>
  );
}
