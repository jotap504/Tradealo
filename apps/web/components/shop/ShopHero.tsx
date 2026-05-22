'use client';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { PublicShop } from '@/types';

const SOCIAL_META: Record<string, { label: string; icon: string; getHref: (v: string) => string }> = {
  instagram: { label: 'Instagram', icon: '📷', getHref: (v) => (v.startsWith('http') ? v : `https://instagram.com/${v}`) },
  facebook: { label: 'Facebook', icon: '📘', getHref: (v) => (v.startsWith('http') ? v : `https://facebook.com/${v}`) },
  tiktok: { label: 'TikTok', icon: '🎵', getHref: (v) => (v.startsWith('http') ? v : `https://tiktok.com/@${v}`) },
  youtube: { label: 'YouTube', icon: '▶️', getHref: (v) => v },
  twitter: { label: 'X', icon: '𝕏', getHref: (v) => (v.startsWith('http') ? v : `https://x.com/${v}`) },
  website: { label: 'Web', icon: '🌐', getHref: (v) => v },
};

export default function ShopHero({ shop }: { shop: PublicShop }) {
  const prefersReduced = useReducedMotion();

  const socials = shop.socialLinks ?? {};
  const displayName = shop.shopName ?? shop.username;
  const initial = (displayName ?? '?')[0].toUpperCase();

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReduced ? 0 : 0.12, delayChildren: 0.15 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ minHeight: 380 }}
    >
      {/* Background */}
      {shop.bannerUrl ? (
        <>
          <Image
            src={shop.bannerUrl}
            alt="Banner de tienda"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Dark gradient overlay — bottom 60% dark */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.70) 70%, rgba(0,0,0,0.82) 100%)',
            }}
          />
        </>
      ) : (
        /* Animated gradient fallback */
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, var(--shop-primary) 0%, #818cf8 50%, var(--shop-primary) 100%)',
            backgroundSize: '300% 300%',
          }}
          animate={prefersReduced ? {} : { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Height spacer — desktop 480px, mobile 380px */}
      <div className="hidden md:block" style={{ height: 480 }} />
      <div className="md:hidden" style={{ height: 380 }} />

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 md:pb-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3"
          >
            {/* Logo + name row */}
            <motion.div variants={itemVariants} transition={{ duration: 0.5, ease: 'easeOut' }} className="flex items-end gap-4">
              {shop.logoUrl ? (
                <div
                  className="relative shrink-0 rounded-2xl overflow-hidden"
                  style={{
                    width: 96,
                    height: 96,
                    border: '4px solid var(--shop-surface)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
                  }}
                >
                  <Image src={shop.logoUrl} alt={displayName ?? 'Logo'} fill className="object-cover" />
                </div>
              ) : (
                <div
                  className="shrink-0 rounded-2xl flex items-center justify-center text-3xl font-bold"
                  style={{
                    width: 96,
                    height: 96,
                    backgroundColor: 'var(--shop-primary)',
                    border: '4px solid var(--shop-surface)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
                    color: '#ffffff',
                  }}
                >
                  {initial}
                </div>
              )}

              <div className="pb-1 min-w-0">
                <h1
                  className="text-3xl font-bold text-white leading-tight"
                  style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
                >
                  {displayName}
                </h1>
                {shop.tagline && (
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.80)' }}>
                    {shop.tagline}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Social row */}
            <motion.div variants={itemVariants} transition={{ duration: 0.5, ease: 'easeOut' }} className="flex flex-wrap items-center gap-2">
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
                    style={{
                      background: 'rgba(255,255,255,0.20)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.30)',
                    }}
                    aria-label={meta.label}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </a>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
