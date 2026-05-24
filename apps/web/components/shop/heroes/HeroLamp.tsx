'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PublicShop } from '@/types';
import type { HeroConfig } from './types';
import SocialIconLinks from '@/components/shop/SocialIconLink';

export default function HeroLamp({ shop, config }: { shop: PublicShop; config: HeroConfig }) {
  const displayName = shop.shopName ?? shop.username;
  const initial = (displayName ?? '?')[0].toUpperCase();
  const title = config.title ?? displayName ?? 'Bienvenido a nuestra tienda';

  return (
    <div className={cn('relative flex w-full flex-col items-center justify-start overflow-hidden bg-slate-950', 'min-h-[480px] md:min-h-[560px]')}>
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          animate={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{ backgroundImage: 'conic-gradient(var(--conic-position), var(--tw-gradient-stops))' }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-cyan-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-[100%] left-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-slate-950 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0.5, width: '15rem' }}
          animate={{ opacity: 1, width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          style={{ backgroundImage: 'conic-gradient(var(--conic-position), var(--tw-gradient-stops))' }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-cyan-500 text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute w-40 h-[100%] right-0 bg-slate-950 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-slate-950 blur-2xl" />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-cyan-500 opacity-50 blur-3xl" />

        <motion.div
          initial={{ width: '8rem' }}
          animate={{ width: '16rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-cyan-400 blur-2xl"
        />

        <motion.div
          initial={{ width: '15rem' }}
          animate={{ width: '30rem' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-cyan-400"
        />

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-slate-950" />
      </div>

      <div className="relative z-50 flex -translate-y-60 flex-col items-center px-5 text-center">
        <motion.h1
          initial={{ opacity: 0.5, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-4xl md:text-6xl font-bold tracking-tight text-transparent"
        >
          {title}
        </motion.h1>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-8 md:pb-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex items-end gap-4">
            {shop.logoUrl ? (
              <div className="relative shrink-0 rounded-2xl overflow-hidden" style={{ width: 80, height: 80, border: '3px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.60)' }}>
                <Image src={shop.logoUrl} alt={displayName ?? 'Logo'} fill className="object-cover" />
              </div>
            ) : (
              <div className="shrink-0 rounded-2xl flex items-center justify-center text-2xl font-bold text-white" style={{ width: 80, height: 80, background: 'var(--shop-primary, #06b6d4)', border: '3px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.60)' }}>
                {initial}
              </div>
            )}
            <div className="pb-1 min-w-0">
              <p className="text-xl font-bold text-white leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{displayName}</p>
              {shop.tagline && <p className="text-xs mt-0.5 text-slate-400">{shop.tagline}</p>}
            </div>
          </div>

          <SocialIconLinks socialLinks={shop.socialLinks} />
        </div>
      </div>
    </div>
  );
}
