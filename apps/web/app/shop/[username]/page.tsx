import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { shop as shopApi } from '@/lib/api';
import ShopNav from '@/components/shop/ShopNav';
import ShopHero from '@/components/shop/ShopHero';
import ShopAnnouncement from '@/components/shop/ShopAnnouncement';
import ShopAbout from '@/components/shop/ShopAbout';
import ShopAnalyticsTracker from '@/components/shop/ShopAnalyticsTracker';
import FeaturedCarousel from '@/components/shop/FeaturedCarousel';
import ShopProductGrid from '@/components/shop/ShopProductGrid';
import ChatbotWidget from '@/components/shop/ChatbotWidget';
import FloatingWhatsApp from '@/components/shop/FloatingWhatsApp';
import ShopFooter from '@/components/shop/ShopFooter';
import ShopThemeProvider from '@/components/shop/ShopThemeProvider';
import { ShopJsonLd } from '@/components/shop/JsonLd';
import { APP_URL } from '@/lib/constants';

export const revalidate = 60;

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const shop = await shopApi.getPublic(params.username);
    const title = shop.metaTitle ?? shop.shopName ?? params.username;
    const description = shop.metaDescription ?? shop.tagline ?? undefined;
    const image = shop.ogImageUrl ?? shop.bannerUrl ?? shop.logoUrl ?? undefined;
    const url = `${APP_URL}/shop/${params.username}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'website',
        locale: 'es_AR',
        siteName: 'Tradealo',
        ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(image && { images: [image] }),
      },
    };
  } catch {
    return { title: params.username };
  }
}

export default async function ShopPage({ params }: Props) {
  let shopData;
  try {
    shopData = await shopApi.getPublic(params.username);
  } catch {
    notFound();
  }

  const resolvedUsername = shopData.username ?? params.username;

  return (
    <ShopThemeProvider theme={shopData.theme} primaryColor={shopData.primaryColor}>
      <ShopJsonLd shop={shopData} />
      <div style={{ backgroundColor: 'var(--shop-bg)', fontFamily: 'var(--shop-font)', minHeight: '100vh' }}>
        <ShopAnalyticsTracker shopId={shopData.id} />

        {/* Nav + Hero — nav overlays hero (transparent → solid on scroll) */}
        <div className="relative">
          <ShopAnnouncement
            shopId={shopData.id}
            text={shopData.announcementText}
            expiresAt={shopData.announcementExpiresAt}
          />
          <ShopNav
            shopName={shopData.shopName}
            logoUrl={shopData.logoUrl}
            username={resolvedUsername}
          />
          <div className="-mt-[60px]">
            <ShopHero shop={shopData} />
          </div>
        </div>

        {/* Pinned / Featured */}
        {shopData.pinnedListings.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-10">
            <FeaturedCarousel listings={shopData.pinnedListings} shopUsername={resolvedUsername} />
          </section>
        )}

        {/* About / Gallery */}
        {(shopData.about || shopData.locationText || (shopData.galleryImages?.length ?? 0) > 0) && (
          <ShopAbout shop={shopData} />
        )}

        {/* All Products */}
        {shopData.allListings.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-10">
            <div className="mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--shop-text)' }}>
                Todos los productos
              </h2>
              <div
                className="mt-1.5 rounded-full"
                style={{ height: 3, width: 48, backgroundColor: 'var(--shop-primary)' }}
              />
            </div>
            <ShopProductGrid listings={shopData.allListings} categoryOrder={shopData.categoryOrder} shopUsername={resolvedUsername} />
          </section>
        )}

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
