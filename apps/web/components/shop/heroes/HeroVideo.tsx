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

  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % words.length);
  }, [words.length]);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(next, 2200);
    return () => clearInterval(id);
  }, [next, words.length]);

  const hasMedia = !!(videoUrl || shop.bannerUrl);

  return (
    <div className="relative w-full flex flex-col overflow-hidden font-sans" style={{ minHeight: 580 }}>

      {/* ── Background ── */}
      {videoUrl ? (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : shop.bannerUrl ? (
        <Image
          src={shop.bannerUrl}
          alt="Banner"
          fill
          priority
          className="object-cover"
          style={{ zIndex: 0 }}
          sizes="100vw"
        />
      ) : (
        /* Fallback: static gradient + pulsing glow overlay */
        <div className="absolute inset-0" style={{ zIndex: 0, background: 'linear-gradient(135deg, var(--shop-primary, #0d9488) 0%, #0f172a 55%, var(--shop-primary, #0d9488) 100%)' }}>
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.25) 0%, transparent 65%)' }}
          />
          {bgText && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none" aria-hidden>
              <span
                className="font-black text-white/[0.05] text-center leading-none select-none whitespace-nowrap"
                style={{ fontSize: 'clamp(5rem, 20vw, 18rem)' }}
              >
                {bgText}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 1, background: hasMedia ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.35)' }}
      />

      {/* ── Center content ── */}
      <div className="relative flex flex-col items-center justify-center flex-1 px-4 text-center" style={{ zIndex: 2, paddingTop: 80, paddingBottom: 120 }}>

        {/* Static prefix */}
        <p
          className="font-extrabold text-white leading-tight mb-4"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}
        >
          {titlePrefix}
        </p>

        {/*
          Rotating word container.
          Font size set HERE so em units are computed correctly.
          height 1.4em clips the y-translate slide without cutting the text.
        */}
        <div
          className="relative overflow-hidden w-full flex justify-center"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', height: '1.4em' }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={currentIndex}
              className="absolute font-extrabold"
              style={{ color: 'var(--shop-primary, #0d9488)', fontSize: 'inherit', lineHeight: 1.3 }}
              initial={{ y: '110%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-110%', opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              {words[currentIndex]}
            </motion.span>
          </AnimatePresence>
        </div>

        {description && (
          <p className="mt-8 text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* ── Bottom: logo + name + socials ── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 md:pb-10" style={{ zIndex: 2 }}>
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex items-end gap-4">
            {shop.logoUrl ? (
              <div
                className="relative shrink-0 rounded-2xl overflow-hidden"
                style={{ width: 80, height: 80, border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              >
                <Image src={shop.logoUrl} alt={displayName ?? 'Logo'} fill className="object-cover" />
              </div>
            ) : (
              <div
                className="shrink-0 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ width: 80, height: 80, background: 'var(--shop-primary, #0d9488)', border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              >
                {initial}
              </div>
            )}
            <div className="pb-1 min-w-0">
              <p className="text-xl font-bold text-white leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
                {displayName}
              </p>
              {shop.tagline && <p className="text-xs mt-0.5 text-white/60">{shop.tagline}</p>}
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
