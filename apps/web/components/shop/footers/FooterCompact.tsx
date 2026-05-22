'use client';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Mail, MessageCircle } from 'lucide-react';
import type { PublicShop } from '@/types';
import type { FooterConfig } from './types';

const SOCIAL_META: Record<
  string,
  { label: string; icon: string; getHref: (v: string) => string }
> = {
  instagram: {
    label: 'Instagram',
    icon: '📷',
    getHref: (v) => (v.startsWith('http') ? v : `https://instagram.com/${v}`),
  },
  facebook: {
    label: 'Facebook',
    icon: '📘',
    getHref: (v) => (v.startsWith('http') ? v : `https://facebook.com/${v}`),
  },
  tiktok: {
    label: 'TikTok',
    icon: '🎵',
    getHref: (v) => (v.startsWith('http') ? v : `https://tiktok.com/@${v}`),
  },
  youtube: { label: 'YouTube', icon: '▶️', getHref: (v) => v },
  twitter: {
    label: 'X',
    icon: '𝕏',
    getHref: (v) => (v.startsWith('http') ? v : `https://x.com/${v}`),
  },
  website: { label: 'Web', icon: '🌐', getHref: (v) => v },
};

export default function FooterCompact({
  shop,
  config,
}: {
  shop: PublicShop;
  config: FooterConfig;
}) {
  const prefersReduced = useReducedMotion();
  const socials = shop.socialLinks ?? {};
  const displayName = shop.shopName ?? shop.username;
  const initial = (displayName ?? '?')[0].toUpperCase();
  const whatsapp = shop.whatsappBusiness;

  const fromLeft = prefersReduced ? { x: 0, opacity: 1 } : { x: -24, opacity: 0 };
  const fromRight = prefersReduced ? { x: 0, opacity: 1 } : { x: 24, opacity: 0 };
  const fade = prefersReduced ? { opacity: 1 } : { opacity: 0 };

  return (
    <footer
      className="w-full mt-12"
      style={{
        backgroundColor: 'var(--shop-surface)',
        borderTop: '3px solid var(--shop-primary)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: brand */}
          <motion.div
            initial={fromLeft}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex items-center gap-3"
          >
            {shop.logoUrl ? (
              <div
                className="relative shrink-0 rounded-lg overflow-hidden"
                style={{
                  width: 40,
                  height: 40,
                  border: '1px solid var(--shop-border)',
                }}
              >
                <Image
                  src={shop.logoUrl}
                  alt={displayName ?? 'Logo'}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            ) : (
              <div
                className="shrink-0 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'var(--shop-primary)',
                  color: '#ffffff',
                }}
              >
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p
                className="font-bold text-sm leading-tight truncate"
                style={{ color: 'var(--shop-text)' }}
              >
                {displayName}
              </p>
              <p
                className="text-[11px]"
                style={{ color: 'var(--shop-text-muted)' }}
              >
                © {new Date().getFullYear()} · Trocalia
              </p>
            </div>
          </motion.div>

          {/* Center: social icons */}
          <motion.div
            initial={fade}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="flex items-center justify-center gap-1.5 flex-wrap"
          >
            {Object.entries(SOCIAL_META).map(([key, meta]) => {
              const val = socials[key as keyof typeof socials];
              if (!val) return null;
              return (
                <a
                  key={key}
                  href={meta.getHref(val)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-base transition-colors"
                  style={{
                    backgroundColor: 'var(--shop-bg)',
                    border: '1px solid var(--shop-border)',
                    color: 'var(--shop-text)',
                  }}
                  aria-label={meta.label}
                  title={meta.label}
                >
                  {meta.icon}
                </a>
              );
            })}
          </motion.div>

          {/* Right: email + whatsapp */}
          <motion.div
            initial={fromRight}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
            className="flex flex-col items-start md:items-end gap-1 text-xs"
            style={{ color: 'var(--shop-text-muted)' }}
          >
            {config.email && (
              <a
                href={`mailto:${config.email}`}
                className="inline-flex items-center gap-1.5 hover:underline"
                style={{ color: 'var(--shop-text)' }}
              >
                <Mail size={13} style={{ color: 'var(--shop-primary)' }} />
                {config.email}
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:underline"
                style={{ color: 'var(--shop-text)' }}
              >
                <MessageCircle size={13} style={{ color: '#16a34a' }} />
                {whatsapp}
              </a>
            )}
            {!config.email && !whatsapp && (
              <span style={{ color: 'var(--shop-text-muted)' }}>
                Powered by Trocalia
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
