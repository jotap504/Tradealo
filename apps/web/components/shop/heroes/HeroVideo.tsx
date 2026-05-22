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
  const bgText = config.bgText as string | undefined;

  const hasBackground = !!(videoUrl || shop.bannerUrl);

  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % words.length);
  }, [words.length]);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(next, 2200);
    return () => clearInterval(id);
  }, [next, words.length]);

  return (
    <div className="relative w-full min-h-[560px] md:min-h-[640px] flex flex-col overflow-hidden font-sans">

      {/* ── Background layer ── */}
      {videoUrl ? (
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : shop.bannerUrl ? (
        <Image
          src={shop.bannerUrl}
          alt="Banner de tienda"
          fill
          priority
          className="object-cover z-0"
          sizes="100vw"
        />
      ) : (
        /* Animated gradient when no media is set */
        <>
          <motion.div
            className="absolute inset-0 z-0"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'linear-gradient(135deg, var(--shop-primary, #0d9488), #1e293b 40%, var(--shop-primary, #0d9488) 80%)',
              backgroundSize: '300% 300%',
            }}
          />
          {/* Large decorative background text — shows the user-provided phrase as visual texture */}
          {bgText && (
            <div
              className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none"
              aria-hidden
            >
              <p
                className="font-black text-white/[0.06] text-center leading-none select-none whitespace-nowrap"
                style={{ fontSize: 'clamp(4rem, 18vw, 16rem)' }}
              >
                {bgText}
              </p>
            </div>
          )}
        </>
      )}

      {/* Dark overlay */}
      <div className={`absolute inset-0 z-10 ${hasBackground ? 'bg-black/65' : 'bg-black/40'}`} />

      {/* ── Center content ── */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full flex-1 px-4 py-20 text-center">

        {/* Prefix line */}
        <p className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
          {titlePrefix}
        </p>

        {/* Rotating word — single AnimatePresence with mode="wait" so exit completes before enter */}
        <div
          className="relative overflow-hidden w-full flex justify-center"
          style={{ height: '1.3em' }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={currentIndex}
              className="absolute text-4xl md:text-6xl font-extrabold"
              style={{ color: 'var(--shop-primary, #0d9488)' }}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.45, ease: [0.25, 0.4, 0.25, 1] }}
            >
              {words[currentIndex]}
            </motion.span>
          </AnimatePresence>
        </div>

        {description && (
          <p className="mt-6 text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* ── Bottom: logo + name + socials ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-8 md:pb-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex items-end gap-4">
            {shop.logoUrl ? (
              <div
                className="relative shrink-0 rounded-2xl overflow-hidden"
                style={{ width: 80, height: 80, border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.60)' }}
              >
                <Image src={shop.logoUrl} alt={displayName ?? 'Logo'} fill className="object-cover" />
              </div>
            ) : (
              <div
                className="shrink-0 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ width: 80, height: 80, background: 'var(--shop-primary, #0d9488)', border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.60)' }}
              >
                {initial}
              </div>
            )}
            <div className="pb-1 min-w-0">
              <p className="text-xl font-bold text-white leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
                {displayName}
              </p>
              {shop.tagline && (
                <p className="text-xs mt-0.5 text-white/60">{shop.tagline}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(SOCIAL_META).map(([key, meta]) => {
              const val = socials[key as keyof typeof socials];
              if (!val) return null;
              return (
                <a
                  key={key}
                  href={meta.getHref(val)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white"
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
                  aria-label={meta.label}
                >
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
