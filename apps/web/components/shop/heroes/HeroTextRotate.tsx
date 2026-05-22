'use client';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicShop } from '@/types';
import type { HeroConfig } from './types';

const SOCIAL_META: Record<string, { label: string; icon: string; getHref: (v: string) => string }> = {
  instagram: { label: 'Instagram', icon: '📷', getHref: (v) => (v.startsWith('http') ? v : `https://instagram.com/${v}`) },
  facebook: { label: 'Facebook', icon: '📘', getHref: (v) => (v.startsWith('http') ? v : `https://facebook.com/${v}`) },
  tiktok: { label: 'TikTok', icon: '🎵', getHref: (v) => (v.startsWith('http') ? v : `https://tiktok.com/@${v}`) },
  youtube: { label: 'YouTube', icon: '▶️', getHref: (v) => v },
  twitter: { label: 'X', icon: '𝕏', getHref: (v) => (v.startsWith('http') ? v : `https://x.com/${v}`) },
  website: { label: 'Web', icon: '🌐', getHref: (v) => v },
};

export default function HeroTextRotate({ shop, config }: { shop: PublicShop; config: HeroConfig }) {
  const displayName = shop.shopName ?? shop.username;
  const initial = (displayName ?? '?')[0].toUpperCase();
  const socials = shop.socialLinks ?? {};

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
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--shop-primary, #0d9488)' }} />

      {/* Logo + name bar */}
      <div className="relative z-10 px-6 md:px-12 pt-10 pb-4 flex items-center gap-4">
        {shop.logoUrl ? (
          <div className="relative shrink-0 rounded-xl overflow-hidden shadow-md" style={{ width: 56, height: 56 }}>
            <Image src={shop.logoUrl} alt={displayName ?? 'Logo'} fill className="object-cover" />
          </div>
        ) : (
          <div className="shrink-0 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-md" style={{ width: 56, height: 56, background: 'var(--shop-primary, #0d9488)' }}>
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-tight truncate">{displayName}</p>
          {shop.tagline && <p className="text-sm text-gray-500 truncate">{shop.tagline}</p>}
        </div>
      </div>

      {/* Main headline: prefix on one line, rotating word below on separate line */}
      <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 py-6 md:py-10">
        <div className="w-full">
          <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-[1.2] mb-5">
            {prefix}
          </p>
          {/* Fixed-height container — clips the slide animation */}
          <div className="relative overflow-hidden" style={{ height: '1.35em' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-110%', opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="absolute inset-0 flex items-center"
              >
                <span
                  className="inline-block px-5 py-1 rounded-xl text-4xl sm:text-5xl md:text-6xl font-bold text-white"
                  style={{ background: 'var(--shop-primary, #0d9488)' }}
                >
                  {words[currentIndex]}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Social pills */}
      {Object.values(socials).some(Boolean) && (
        <div className="relative z-10 px-6 md:px-12 pb-8 flex flex-wrap items-center gap-2">
          {Object.entries(SOCIAL_META).map(([key, meta]) => {
            const val = socials[key as keyof typeof socials];
            if (!val) return null;
            return (
              <a
                key={key}
                href={meta.getHref(val)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
                aria-label={meta.label}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
