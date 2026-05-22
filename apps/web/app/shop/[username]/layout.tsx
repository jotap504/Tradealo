import type { Metadata } from 'next';
import { shop as shopApi } from '@/lib/api';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  try {
    const shopData = await shopApi.getPublic(params.username);
    return {
      title: shopData.metaTitle ?? shopData.shopName ?? params.username,
      description: shopData.metaDescription ?? shopData.tagline ?? undefined,
      openGraph: shopData.ogImageUrl ? { images: [shopData.ogImageUrl] } : undefined,
    };
  } catch {
    return { title: params.username };
  }
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
