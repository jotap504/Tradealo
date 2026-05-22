'use client';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface ListingItem {
  id: string;
  title: string;
  price: string;
  currency: 'ARS' | 'USD';
  condition: string;
  primaryImageUrl: string | null;
}

interface ProductCardProps {
  listing: ListingItem;
  index: number;
}

function conditionColor(condition: string): { bg: string; text: string } {
  const lower = condition.toLowerCase();
  if (lower === 'new' || lower === 'nuevo') return { bg: '#dcfce7', text: '#16a34a' };
  if (lower === 'used' || lower === 'usado') return { bg: '#f3f4f6', text: '#6b7280' };
  return { bg: 'var(--shop-primary)', text: '#ffffff' };
}

function conditionLabel(condition: string): string {
  const map: Record<string, string> = {
    new: 'Nuevo',
    nuevo: 'Nuevo',
    used: 'Usado',
    usado: 'Usado',
    refurbished: 'Reacond.',
  };
  return map[condition.toLowerCase()] ?? condition;
}

function formatPrice(price: string, currency: 'ARS' | 'USD'): string {
  const num = Number(price);
  const symbol = currency === 'USD' ? 'U$D' : '$';
  return `${symbol} ${num.toLocaleString('es-AR')}`;
}

export const productCardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ProductCard({ listing, index }: ProductCardProps) {
  const prefersReduced = useReducedMotion();
  const badge = conditionColor(listing.condition);

  return (
    <motion.div
      variants={prefersReduced ? undefined : productCardVariants}
      transition={{ duration: 0.35, delay: prefersReduced ? 0 : index * 0.04, ease: 'easeOut' }}
      whileHover={
        prefersReduced
          ? undefined
          : { y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }
      }
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid var(--shop-border)',
        backgroundColor: 'var(--shop-surface)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      <Link href={`/listing/${listing.id}`} className="block group">
        {/* Image container */}
        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '1/1' }}>
          {listing.primaryImageUrl ? (
            <Image
              src={listing.primaryImageUrl}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-3xl"
              style={{ backgroundColor: 'var(--shop-border)' }}
            >
              📦
            </div>
          )}

          {/* Condition badge */}
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {conditionLabel(listing.condition)}
          </span>

          {/* Hover overlay — "Ver producto" button */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
            }}
          >
            <span
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'var(--shop-primary)' }}
            >
              Ver producto →
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-2.5">
          <p
            className="text-sm font-medium leading-snug"
            style={{
              color: 'var(--shop-text)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {listing.title}
          </p>
          <p className="text-base font-bold mt-1" style={{ color: 'var(--shop-primary)' }}>
            {formatPrice(listing.price, listing.currency)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
