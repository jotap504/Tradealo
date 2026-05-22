'use client';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import ProductCard, { productCardVariants } from '@/components/shop/ProductCard';
import type { PublicShop } from '@/types';

type ListingItem = PublicShop['allListings'][number];

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

export default function ShopProductGrid({ listings }: { listings: ListingItem[] }) {
  const [query, setQuery] = useState('');
  const prefersReduced = useReducedMotion();

  const filtered = query.trim()
    ? listings.filter((l) => l.title.toLowerCase().includes(query.toLowerCase()))
    : listings;

  return (
    <div>
      {/* Search */}
      <div className="mb-5">
        <div
          className="flex items-center gap-2 rounded-full border px-4 py-2.5 max-w-md"
          style={{
            borderColor: 'var(--shop-border)',
            backgroundColor: 'var(--shop-surface)',
          }}
        >
          <span className="text-base shrink-0" aria-hidden>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos…"
            className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
            style={{ color: 'var(--shop-text)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 text-xs opacity-60 hover:opacity-100"
              style={{ color: 'var(--shop-text-muted)' }}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 text-sm"
          style={{ color: 'var(--shop-text-muted)' }}
        >
          No se encontraron productos
        </div>
      ) : (
        <motion.div
          key={query}
          variants={prefersReduced ? undefined : gridVariants}
          initial={prefersReduced ? undefined : 'hidden'}
          whileInView={prefersReduced ? undefined : 'visible'}
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        >
          {filtered.map((listing, i) => (
            <motion.div
              key={listing.id}
              variants={prefersReduced ? undefined : productCardVariants}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <ProductCard listing={listing} index={i} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
