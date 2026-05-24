'use client';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicShop } from '@/types';
import type { HeroConfig } from './types';
import SocialIconLinks from '@/components/shop/SocialIconLink';

export default function HeroTextRotate({ shop, config }: { shop: PublicShop; config: HeroConfig }) {
  const displayName = shop.shopName ?? shop.username;
  const initial = (displayName ?? '?')[0].toUpperCase();

  const prefix = config.prefix ?? 'Encontrá lo mejor en';
  const words = config.words && config.words.length > 0 ? config.words : [displayName ?? 'tu tienda'];

  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % words.length);
  }, [words.length]);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(next, 2400);
    return () => clearInterval(id);
  }, [next, words.length]);

  return (
    <div className="relative w-full min-h-[440px] md:min-h-[520px] flex flex-col overflow-hidden bg-white">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--shop-primary, #0d9488)' }} />

      {/* Logo + name */}
      <div className="relative z-10 px-6 md:px-12 pt-10 pb-4 flex items-center gap-4">
        {shop.logoUrl ? (
          <div className="relative shrink-0 rounded-xl overflow-hidden shadow-md" style={{ width: 56, height: 56 }}>
            <Image src={shop.logoUrl} alt={displayName ?? 'Logo'} fill className="object-cover" />
          </div>
        ) : (
          <div
            className="shrink-0 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-md"
            style={{ width: 56, height: 56, background: 'var(--shop-primary, #0d9488)' }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-tight truncate">{displayName}</p>
          {shop.tagline && <p className="text-sm text-gray-500 truncate">{shop.tagline}</p>}
        </div>
      </div>

      {/* Headline */}
      <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 py-6 md:py-10">
        <div className="w-full">
          {/* Prefix — static */}
          <p className="font-bold text-gray-900 leading-[1.25] mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            {prefix}
          </p>

          {/*
            Rotating word container.
            Key trick: set font-size here with CSS so 'em' units inside are
            relative to THIS element's font size, not the document root.
            height 1.9em = enough for the text + vertical padding at any breakpoint.
          */}
          <div
            className="relative overflow-hidden"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', height: '1.9em' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-110%', opacity: 0 }}
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 flex items-center"
              >
                <span
                  className="inline-block font-bold text-white rounded-xl"
                  style={{
                    background: 'var(--shop-primary, #0d9488)',
                    padding: '0.18em 0.55em',
                    fontSize: 'inherit',
                    lineHeight: 1.25,
                  }}
                >
                  {words[currentIndex]}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 md:px-12 pb-8">
        <SocialIconLinks socialLinks={shop.socialLinks} />
      </div>
    </div>
  );
}
