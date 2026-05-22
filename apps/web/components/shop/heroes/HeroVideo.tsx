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

export default function HeroVideo({ shop, config }: { shop: PublicShop; config: HeroConfig }) {
  const displayName = shop.shopName ?? shop.username;
  const initial = (displayName ?? '?')[0].toUpperCase();
  const socials = shop.socialLinks ?? {};

  const videoUrl = config.videoUrl;
  const titlePrefix = config.titlePrefix ?? 'Bienvenido a';
  const words = config.words && config.words.length > 0 ? config.words : [displayName ?? 'nuestra tienda'];
  const description = config.description ?? (shop.tagline ?? '');

  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % words.length);
  }, [words.length]);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(next, 2000);
    return () => clearInterval(id);
  }, [next, words.length]);

  return (
    <div className="relative w-full min-h-[480px] md:min-h-screen flex flex-col overflow-hidden font-sans">
      {videoUrl ? (
        <video className="absolute inset-0 w-full h-full object-cover z-0" src={videoUrl} autoPlay loop muted playsInline />
      ) : shop.bannerUrl ? (
        <Image src={shop.bannerUrl} alt="Banner de tienda" fill priority className="object-cover z-0" sizes="100vw" />
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 to-black" />
      )}

      <div className="absolute inset-0 bg-black/75 z-10" />

      <div className="relative z-20 flex flex-col items-center justify-center w-full flex-1 min-h-[480px]">
        <div className="flex gap-6 py-16 lg:py-32 items-center justify-center flex-col w-full px-4">
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-4xl md:text-6xl max-w-2xl tracking-tight text-center font-extrabold text-white">
              <span>{titlePrefix}</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-3 md:pt-1">
                &nbsp;
                {words.map((word, index) => (
                  <AnimatePresence key={index} mode="sync">
                    {currentIndex === index && (
                      <motion.span
                        key={word + String(index)}
                        className="absolute font-extrabold"
                        style={{ color: 'var(--shop-primary, #0d9488)' }}
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 150, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 50 }}
                      >
                        {word}
                      </motion.span>
                    )}
                  </AnimatePresence>
                ))}
              </span>
            </h1>

            {description && (
              <p className="text-base md:text-lg leading-relaxed tracking-tight text-white/80 max-w-xl text-center">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-8 md:pb-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex items-end gap-4">
            {shop.logoUrl ? (
              <div className="relative shrink-0 rounded-2xl overflow-hidden" style={{ width: 80, height: 80, border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.60)' }}>
                <Image src={shop.logoUrl} alt={displayName ?? 'Logo'} fill className="object-cover" />
              </div>
            ) : (
              <div className="shrink-0 rounded-2xl flex items-center justify-center text-2xl font-bold text-white" style={{ width: 80, height: 80, background: 'var(--shop-primary, #0d9488)', border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.60)' }}>
                {initial}
              </div>
            )}
            <div className="pb-1 min-w-0">
              <p className="text-xl font-bold text-white leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{displayName}</p>
              {shop.tagline && <p className="text-xs mt-0.5 text-white/60">{shop.tagline}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(SOCIAL_META).map(([key, meta]) => {
              const val = socials[key as keyof typeof socials];
              if (!val) return null;
              return (
                <a key={key} href={meta.getHref(val)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }} aria-label={meta.label}>
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
