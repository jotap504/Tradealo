'use client';
import dynamic from 'next/dynamic';
import type { PublicShop } from '@/types';
import type { FooterConfig } from './footers/types';

const FooterColumnas = dynamic(() => import('./footers/FooterColumnas'), {
  ssr: false,
});
const FooterCompact = dynamic(() => import('./footers/FooterCompact'), {
  ssr: false,
});
const FooterExpandido = dynamic(() => import('./footers/FooterExpandido'), {
  ssr: false,
});

export default function ShopFooter({ shop }: { shop: PublicShop }) {
  const template = shop.footerTemplate ?? 'none';
  const config = (shop.footerConfig ?? {}) as FooterConfig;

  switch (template) {
    case 'columnas':
      return <FooterColumnas shop={shop} config={config} />;
    case 'compact':
      return <FooterCompact shop={shop} config={config} />;
    case 'expandido':
      return <FooterExpandido shop={shop} config={config} />;
    default:
      return null;
  }
}
