'use client';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PublicShop } from '@/types';
import type { HeroConfig } from './types';
import SocialIconLinks from '@/components/shop/SocialIconLink';

export default function HeroVideo({ shop, config }: { shop: PublicShop; config: HeroConfig }) {
  const displayName = shop.shopName ?? shop.username;
  const initial = (displayName ?? '?')[0].toUpperCase();

  const videoUrl = config.videoUrl;
  const titlePrefix = config.titlePrefix ?? 'Bienvenido a';
  const words = useMemo(
    () => (config.words && config.words.length > 0 ? config.words : [displayName ?? 'nuestra tienda']),
    [config.words, displayName],
  );
  const description = config.description ?? (shop.tagline ?? '');
  const bgText = config.bgText as string | undefined;

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setTimeout(function tick() {
      setCurrentIndex((i) => (i + 1) % words.length);
      return;
    }, 2200);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, words.length]);

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
        <div
          className="absolute inset-0"
          style={{
            zIndex: 0,
            background: 'linear-gradient(135deg, var(--shop-primary, #0d9488) 0%, #0f172a 55%, var(--shop-primary, #0d9488) 100%)',
          }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.25) 0%, transparent 65%)' }}
          />
          {bgText && (
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
              aria-hidden
            >
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
      <div
        className="relative flex flex-col items-center justify-center flex-1 px-4 text-center"
        style={{ zIndex: 2, paddingTop: 80, paddingBottom: 120 }}
      >
        {/* Static prefix */}
        <motion.p
          className="font-extrabold text-white leading-tight mb-4"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
        >
          {titlePrefix}
        </motion.p>

        {/*
          Rotating word container — renders ALL words simultaneously,
          each animated to y=0 when active, y=±150 when inactive.
          Spring physics make it naturally smooth without AnimatePresence.
        */}
        <div
          className="relative overflow-hidden w-full flex justify-center"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', height: '1.4em' }}
        >
          {words.map((word, index) => (
            <motion.span
              key={index}
              className="absolute font-extrabold"
              style={{ color: 'var(--shop-primary, #0d9488)', fontSize: 'inherit', lineHeight: 1.3 }}
              initial={{ opacity: 0, y: 150 }}
              animate={
                currentIndex === index
                  ? { y: 0, opacity: 1 }
                  : { y: currentIndex > index ? -150 : 150, opacity: 0 }
              }
              transition={{ type: 'spring', stiffness: 60, damping: 18 }}
            >
              {word}
            </motion.span>
          ))}
        </div>

        {description && (
          <motion.p
            className="mt-8 text-base md:text-lg text-white/80 max-w-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          >
            {description}
          </motion.p>
        )}
      </div>

      {/* ── Bottom: logo + name + socials ── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 md:pb-10" style={{ zIndex: 2 }}>
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <motion.div
            className="flex items-end gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          >
            {shop.logoUrl ? (
              <div
                className="relative shrink-0 rounded-2xl overflow-hidden"
                style={{
                  width: 80,
                  height: 80,
                  border: '3px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              >
                <Image src={shop.logoUrl} alt={displayName ?? 'Logo'} fill className="object-cover" />
              </div>
            ) : (
              <div
                className="shrink-0 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  width: 80,
                  height: 80,
                  background: 'var(--shop-primary, #0d9488)',
                  border: '3px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              >
                {initial}
              </div>
            )}
            <div className="pb-1 min-w-0">
              <p
                className="text-xl font-bold text-white leading-tight"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
              >
                {displayName}
              </p>
              {shop.tagline && <p className="text-xs mt-0.5 text-white/60">{shop.tagline}</p>}
            </div>
          </motion.div>

          <SocialIconLinks socialLinks={shop.socialLinks} />
        </div>
      </div>
    </div>
  );
}
