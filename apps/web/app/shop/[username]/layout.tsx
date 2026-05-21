import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { shop as shopApi } from '@/lib/api';
import ShopThemeProvider from '@/components/shop/ShopThemeProvider';
import ShopNav from '@/components/shop/ShopNav';

interface Props {
  children: React.ReactNode;
  params: { username: string };
}

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

export default async function ShopLayout({ children, params }: Props) {
  let shopData;
  try {
    shopData = await shopApi.getPublic(params.username);
  } catch {
    notFound();
  }

  return (
    <ShopThemeProvider theme={shopData.theme}>
      <ShopNav shopName={shopData.shopName} logoUrl={shopData.logoUrl} username={params.username} />
      {children}
    </ShopThemeProvider>
  );
}
