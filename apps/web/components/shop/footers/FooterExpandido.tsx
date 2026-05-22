'use client';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
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

export default function FooterExpandido({
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
  const whatsapp = shop.whatsappBusiness;
  const businessHours =
    (shop.businessHours as Record<string, string> | null) ?? null;
  const hourEntries = businessHours ? Object.entries(businessHours) : [];
  const showMap = !!(config.showMap && config.mapEmbedUrl);
  const showHours = !!config.showHours && hourEntries.length > 0;

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
  };
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReduced ? 0 : 0.12,
        delayChildren: 0.05,
      },
    },
  };

  return (
    <footer
      className="w-full mt-12"
      style={{
        backgroundColor: 'var(--shop-bg)',
        backgroundImage:
          'linear-gradient(to bottom, color-mix(in srgb, var(--shop-primary) 6%, var(--shop-bg)) 0%, var(--shop-bg) 30%)',
        borderTop: '1px solid var(--shop-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          {/* Column 1: brand */}
          <motion.div variants={itemVariants}>
            <div className="flex items-start gap-3 mb-4">
              {shop.logoUrl ? (
                <div
                  className="relative shrink-0 rounded-2xl overflow-hidden"
                  style={{
                    width: 64,
                    height: 64,
                    border: '2px solid var(--shop-border)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                  }}
                >
                  <Image
                    src={shop.logoUrl}
                    alt={displayName ?? 'Logo'}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div
                  className="shrink-0 rounded-2xl flex items-center justify-center text-2xl font-bold"
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: 'var(--shop-primary)',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                  }}
                >
                  {initial}
                </div>
              )}
              <div className="min-w-0 pt-1">
                <h3
                  className="font-bold text-xl leading-tight truncate"
                  style={{ color: 'var(--shop-text)' }}
                >
                  {displayName}
                </h3>
                {tagline && (
                  <p
                    className="text-sm mt-1 leading-relaxed"
                    style={{ color: 'var(--shop-text-muted)' }}
                  >
                    {tagline}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {Object.entries(SOCIAL_META).map(([key, meta]) => {
                const val = socials[key as keyof typeof socials];
                if (!val) return null;
                return (
                  <a
                    key={key}
                    href={meta.getHref(val)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: 'var(--shop-surface)',
                      border: '1px solid var(--shop-border)',
                      color: 'var(--shop-text)',
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
              className="font-bold text-sm uppercase tracking-wider mb-4"
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
                    style={{ color: 'var(--shop-text)' }}
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
                    style={{ color: 'var(--shop-text)' }}
                  >
                    {config.phone}
                  </a>
                </li>
              )}
              {whatsapp && (
                <li className="flex items-start gap-2.5">
                  <MessageCircle
                    size={16}
                    className="mt-0.5 shrink-0"
                    style={{ color: '#16a34a' }}
                  />
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: 'var(--shop-text)' }}
                  >
                    WhatsApp · {whatsapp}
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
                  <span style={{ color: 'var(--shop-text)' }}>{config.address}</span>
                </li>
              )}
            </ul>

            {showHours && (
              <div className="mt-6">
                <h4
                  className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: 'var(--shop-primary)' }}
                >
                  <Clock size={13} />
                  Horarios
                </h4>
                <table className="w-full text-sm">
                  <tbody>
                    {hourEntries.map(([day, hours]) => (
                      <tr key={day}>
                        <td
                          className="py-1 pr-3 font-medium capitalize"
                          style={{ color: 'var(--shop-text)' }}
                        >
                          {formatDayLabel(day)}
                        </td>
                        <td
                          className="py-1 text-right"
                          style={{ color: 'var(--shop-text-muted)' }}
                        >
                          {hours}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Column 3: map */}
          <motion.div variants={itemVariants}>
            {showMap ? (
              <>
                <h4
                  className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2"
                  style={{ color: 'var(--shop-primary)' }}
                >
                  <MapPin size={13} />
                  Ubicación
                </h4>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--shop-border)' }}
                >
                  <iframe
                    src={config.mapEmbedUrl}
                    width="100%"
                    height="200"
                    style={{ border: 0, display: 'block' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    title={`Ubicación de ${displayName}`}
                  />
                </div>
                {config.address && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: 'var(--shop-text-muted)' }}
                  >
                    {config.address}
                  </p>
                )}
              </>
            ) : (
              <>
                <h4
                  className="font-bold text-sm uppercase tracking-wider mb-4"
                  style={{ color: 'var(--shop-primary)' }}
                >
                  Sobre nosotros
                </h4>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--shop-text-muted)' }}
                >
                  {shop.about ??
                    'Conocenos mejor a través de nuestras redes sociales y nuestra tienda online. Gracias por confiar en nosotros.'}
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>

      <div
        className="border-t"
        style={{
          backgroundColor: '#0f172a',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p
            className="text-xs"
            style={{ color: 'rgba(226,232,240,0.7)' }}
          >
            © {new Date().getFullYear()} {displayName} · Todos los derechos reservados
          </p>
          <p
            className="text-xs"
            style={{ color: 'rgba(226,232,240,0.45)' }}
          >
            Powered by{' '}
            <span style={{ color: 'var(--shop-primary)' }}>Trocalia</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
