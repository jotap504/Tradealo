'use client';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
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

const DAY_LABEL: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  miércoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  sábado: 'Sábado',
  domingo: 'Domingo',
};

function formatDayLabel(key: string): string {
  return DAY_LABEL[key.toLowerCase()] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export default function FooterColumnas({
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
  const tagline = config.customTagline ?? shop.tagline ?? '';
  const businessHours =
    (shop.businessHours as Record<string, string> | null) ?? null;
  const hourEntries = businessHours ? Object.entries(businessHours) : [];

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReduced ? 0 : 0.12,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <footer
      className="w-full mt-12"
      style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          {/* Column 1: brand */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-3 mb-4">
              {shop.logoUrl ? (
                <div
                  className="relative shrink-0 rounded-xl overflow-hidden"
                  style={{
                    width: 52,
                    height: 52,
                    border: '2px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <Image
                    src={shop.logoUrl}
                    alt={displayName ?? 'Logo'}
                    fill
                    className="object-cover"
                    sizes="52px"
                  />
                </div>
              ) : (
                <div
                  className="shrink-0 rounded-xl flex items-center justify-center text-xl font-bold"
                  style={{
                    width: 52,
                    height: 52,
                    backgroundColor: 'var(--shop-primary)',
                    color: '#ffffff',
                  }}
                >
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-lg leading-tight text-white truncate">
                  {displayName}
                </h3>
              </div>
            </div>
            {tagline && (
              <p
                className="text-sm leading-relaxed mb-5"
                style={{ color: 'rgba(226,232,240,0.72)' }}
              >
                {tagline}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {Object.entries(SOCIAL_META).map(([key, meta]) => {
                const val = socials[key as keyof typeof socials];
                if (!val) return null;
                return (
                  <a
                    key={key}
                    href={meta.getHref(val)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                    aria-label={meta.label}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </a>
                );
              })}
            </div>
          </motion.div>

          {/* Column 2: contact */}
          <motion.div variants={itemVariants}>
            <h4
              className="font-semibold text-sm uppercase tracking-wider mb-4"
              style={{ color: 'var(--shop-primary)' }}
            >
              Contacto
            </h4>
            <ul className="space-y-3 text-sm">
              {config.email && (
                <li className="flex items-start gap-2.5">
                  <Mail
                    size={16}
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--shop-primary)' }}
                  />
                  <a
                    href={`mailto:${config.email}`}
                    className="hover:underline break-all"
                    style={{ color: 'rgba(226,232,240,0.88)' }}
                  >
                    {config.email}
                  </a>
                </li>
              )}
              {config.phone && (
                <li className="flex items-start gap-2.5">
                  <Phone
                    size={16}
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--shop-primary)' }}
                  />
                  <a
                    href={`tel:${config.phone}`}
                    className="hover:underline"
                    style={{ color: 'rgba(226,232,240,0.88)' }}
                  >
                    {config.phone}
                  </a>
                </li>
              )}
              {config.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin
                    size={16}
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--shop-primary)' }}
                  />
                  <span style={{ color: 'rgba(226,232,240,0.88)' }}>
                    {config.address}
                  </span>
                </li>
              )}
              {!config.email && !config.phone && !config.address && (
                <li
                  className="text-xs italic"
                  style={{ color: 'rgba(226,232,240,0.5)' }}
                >
                  Sin datos de contacto cargados.
                </li>
              )}
            </ul>
          </motion.div>

          {/* Column 3: hours */}
          <motion.div variants={itemVariants}>
            <h4
              className="font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2"
              style={{ color: 'var(--shop-primary)' }}
            >
              <Clock size={14} />
              Horarios
            </h4>
            {hourEntries.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {hourEntries.map(([day, hours]) => (
                    <tr key={day}>
                      <td
                        className="py-1 pr-3 font-medium capitalize"
                        style={{ color: 'rgba(226,232,240,0.95)' }}
                      >
                        {formatDayLabel(day)}
                      </td>
                      <td
                        className="py-1 text-right"
                        style={{ color: 'rgba(226,232,240,0.7)' }}
                      >
                        {hours}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p
                className="text-xs italic"
                style={{ color: 'rgba(226,232,240,0.5)' }}
              >
                Sin horarios configurados.
              </p>
            )}
          </motion.div>
        </motion.div>
      </div>

      <div
        className="border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <p
            className="text-xs text-center"
            style={{ color: 'rgba(226,232,240,0.55)' }}
          >
            © {new Date().getFullYear()} {displayName} · Powered by{' '}
            <span style={{ color: 'var(--shop-primary)' }}>Trocalia</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
