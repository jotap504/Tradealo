'use client';
import dynamic from 'next/dynamic';
import type { PublicShop } from '@/types';
import type { HeroConfig } from './heroes/types';
import HeroClassic from './heroes/HeroClassic';

const HeroGeometric = dynamic(() => import('./heroes/HeroGeometric'), { ssr: false });
const HeroTextRotate = dynamic(() => import('./heroes/HeroTextRotate'), { ssr: false });
const HeroLamp = dynamic(() => import('./heroes/HeroLamp'), { ssr: false });
const HeroVideo = dynamic(() => import('./heroes/HeroVideo'), { ssr: false });

export default function ShopHero({ shop }: { shop: PublicShop }) {
  const template = shop.heroTemplate ?? 'classic';
  const config = (shop.heroConfig ?? {}) as HeroConfig;

  switch (template) {
    case 'geometric':
      return <HeroGeometric shop={shop} config={config} />;
    case 'text-rotate':
      return <HeroTextRotate shop={shop} config={config} />;
    case 'lamp':
      return <HeroLamp shop={shop} config={config} />;
    case 'video':
      return <HeroVideo shop={shop} config={config} />;
    default:
      return <HeroClassic shop={shop} />;
  }
}
