'use client';
import { useState, useMemo } from 'react';
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

interface Props {
  listings: ListingItem[];
  categoryOrder?: string[];
}

export default function ShopProductGrid({ listings, categoryOrder = [] }: Props) {
  const [query, setQuery] = useState('');
  const prefersReduced = useReducedMotion();

  const filtered = query.trim()
    ? listings.filter((l) => l.title.toLowerCase().includes(query.toLowerCase()))
    : listings;

  // Group by category, respecting categoryOrder
  const grouped = useMemo(() => {
    const map = new Map<string, ListingItem[]>();
    for (const l of filtered) {
      const key = l.categoryName ?? 'Otros';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }

    // Build ordered list of category names
    const ordered: string[] = [];
    for (const cat of categoryOrder) {
      if (map.has(cat)) ordered.push(cat);
    }
    // Append remaining categories not in the order list
    for (const cat of Array.from(map.keys())) {
      if (!ordered.includes(cat)) ordered.push(cat);
    }

    return ordered.map((cat) => ({ name: cat, items: map.get(cat)! }));
  }, [filtered, categoryOrder]);

  const showCategories = !query.trim() && grouped.length > 1;

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

      {filtered.length === 0 ? (
        <div
          className="text-center py-16 text-sm"
          style={{ color: 'var(--shop-text-muted)' }}
        >
          No se encontraron productos
        </div>
      ) : showCategories ? (
        <div className="space-y-10">
          {grouped.map((group) => (
            <div key={group.name}>
              {/* Category heading */}
              <div className="mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--shop-text)' }}>
                  {group.name}
                </h3>
                <div
                  className="mt-1 rounded-full"
                  style={{ height: 2, width: 32, backgroundColor: 'var(--shop-primary)' }}
                />
              </div>
              <motion.div
                variants={prefersReduced ? undefined : gridVariants}
                initial={prefersReduced ? undefined : 'hidden'}
                whileInView={prefersReduced ? undefined : 'visible'}
                viewport={{ once: true }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
              >
                {group.items.map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    variants={prefersReduced ? undefined : productCardVariants}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <ProductCard listing={listing} index={i} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
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
