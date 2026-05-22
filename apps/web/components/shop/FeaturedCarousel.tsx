'use client';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { PublicShop } from '@/types';

type PinnedListing = PublicShop['pinnedListings'][number];

function formatPrice(price: string, currency: 'ARS' | 'USD'): string {
  const num = Number(price);
  const symbol = currency === 'USD' ? 'U$D' : '$';
  return `${symbol} ${num.toLocaleString('es-AR')}`;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

function FeaturedCard({ item, reduced }: { item: PinnedListing; reduced: boolean | null }) {
  return (
    <motion.div
      variants={reduced ? {} : cardVariants}
      initial={reduced ? false : 'hidden'}
      animate={reduced ? {} : 'visible'}
      whileHover={reduced ? undefined : { scale: 1.03 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="shrink-0 snap-start"
      style={{ width: 200 }}
    >
      <Link
        href={`/listing/${item.listing.id}`}
        className="block rounded-2xl overflow-hidden"
        style={{
          border: '1px solid var(--shop-border)',
          backgroundColor: 'var(--shop-surface)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Image */}
        <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
          {item.listing.primaryImageUrl ? (
            <Image
              src={item.listing.primaryImageUrl}
              alt={item.listing.title}
              fill
              className="object-cover"
              sizes="200px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl"
              style={{ backgroundColor: 'var(--shop-border)' }}
            >
              📦
            </div>
          )}
          {/* DESTACADO badge */}
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--shop-primary)' }}
          >
            DESTACADO
          </span>
        </div>

        {/* Info */}
        <div className="p-3">
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
            {item.listing.title}
          </p>
          <p className="text-base font-bold mt-1" style={{ color: 'var(--shop-primary)' }}>
            {formatPrice(item.listing.price, item.listing.currency)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function FeaturedCarousel({ listings }: { listings: PublicShop['pinnedListings'] }) {
  const prefersReduced = useReducedMotion();

  if (!listings || listings.length === 0) return null;

  return (
    <div>
      {/* Section title */}
      <div className="mb-4">
        <h2 className="text-xl font-bold inline-flex items-center gap-2" style={{ color: 'var(--shop-text)' }}>
          ✨ Destacados
        </h2>
        <div
          className="mt-1.5 rounded-full"
          style={{ height: 3, width: 48, backgroundColor: 'var(--shop-primary)' }}
        />
      </div>

      {/* Carousel */}
      <motion.div
        variants={prefersReduced ? undefined : containerVariants}
        initial={prefersReduced ? undefined : 'hidden'}
        whileInView={prefersReduced ? undefined : 'visible'}
        viewport={{ once: true }}
        className="flex gap-4 pb-3"
        style={{
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {listings.map((item) => (
          <FeaturedCard key={item.listingId} item={item} reduced={prefersReduced} />
        ))}
      </motion.div>
    </div>
  );
}
