'use client';
import { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import ProductCard, { productCardVariants } from '@/components/shop/ProductCard';
import type { PublicShop } from '@/types';

type ListingItem = PublicShop['allListings'][number];

type ConditionFilter = 'all' | 'new' | 'used' | 'refurbished';
type SortMode = 'newest' | 'oldest' | 'price_desc' | 'price_asc';

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const CONDITION_OPTIONS: { value: ConditionFilter; label: string }[] = [
  { value: 'all', label: 'Cualquier estado' },
  { value: 'new', label: 'Nuevo' },
  { value: 'used', label: 'Usado' },
  { value: 'refurbished', label: 'Reacond.' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'newest', label: 'Más nuevos primero' },
  { value: 'oldest', label: 'Más antiguos primero' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
];

function normalizeCondition(raw: string): ConditionFilter {
  const c = raw.toLowerCase();
  if (c === 'new' || c === 'nuevo') return 'new';
  if (c === 'used' || c === 'usado') return 'used';
  if (c === 'refurbished' || c === 'reacond' || c === 'reacondicionado')
    return 'refurbished';
  return 'all';
}

interface Props {
  listings: ListingItem[];
  categoryOrder?: string[];
  shopUsername?: string;
}

export default function ShopProductGrid({
  listings,
  categoryOrder = [],
  shopUsername,
}: Props) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const prefersReduced = useReducedMotion();

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) {
      set.add(l.categoryName ?? 'Otros');
    }
    const ordered: string[] = [];
    for (const cat of categoryOrder) {
      if (set.has(cat)) ordered.push(cat);
    }
    for (const cat of Array.from(set)) {
      if (!ordered.includes(cat)) ordered.push(cat);
    }
    return ordered;
  }, [listings, categoryOrder]);

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = listings.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q)) return false;
      if (
        categoryFilter !== 'all' &&
        (l.categoryName ?? 'Otros') !== categoryFilter
      )
        return false;
      if (featuredOnly && !l.isFeatured) return false;
      if (
        conditionFilter !== 'all' &&
        normalizeCondition(l.condition) !== conditionFilter
      )
        return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'newest' || sort === 'oldest') {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return sort === 'newest' ? tb - ta : ta - tb;
      }
      const pa = Number(a.price);
      const pb = Number(b.price);
      return sort === 'price_desc' ? pb - pa : pa - pb;
    });

    return sorted;
  }, [listings, query, categoryFilter, featuredOnly, conditionFilter, sort]);

  const filtersActive =
    !!query.trim() ||
    categoryFilter !== 'all' ||
    featuredOnly ||
    conditionFilter !== 'all';

  const grouped = useMemo(() => {
    const map = new Map<string, ListingItem[]>();
    for (const l of processed) {
      const key = l.categoryName ?? 'Otros';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    const ordered: string[] = [];
    for (const cat of categoryOrder) {
      if (map.has(cat)) ordered.push(cat);
    }
    for (const cat of Array.from(map.keys())) {
      if (!ordered.includes(cat)) ordered.push(cat);
    }
    return ordered.map((cat) => ({ name: cat, items: map.get(cat)! }));
  }, [processed, categoryOrder]);

  const showCategories =
    !filtersActive && sort === 'newest' && grouped.length > 1;

  const selectStyle = {
    backgroundColor: 'var(--shop-surface)',
    color: 'var(--shop-text)',
    borderColor: 'var(--shop-border)',
  } as const;

  const handleReset = () => {
    setQuery('');
    setCategoryFilter('all');
    setFeaturedOnly(false);
    setConditionFilter('all');
    setSort('newest');
  };

  return (
    <div>
      <div className="mb-3">
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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-full border px-3 text-sm focus:outline-none"
          style={selectStyle}
          aria-label="Categoría"
        >
          <option value="all">Todas las categorías</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value as ConditionFilter)}
          className="h-9 rounded-full border px-3 text-sm focus:outline-none"
          style={selectStyle}
          aria-label="Estado"
        >
          {CONDITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setFeaturedOnly((v) => !v)}
          aria-pressed={featuredOnly}
          className="h-9 rounded-full border px-3 text-sm font-medium transition-colors"
          style={
            featuredOnly
              ? {
                  backgroundColor: 'var(--shop-primary)',
                  color: '#ffffff',
                  borderColor: 'var(--shop-primary)',
                }
              : selectStyle
          }
        >
          ★ Destacados
        </button>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="h-9 rounded-full border px-3 text-sm focus:outline-none ml-auto"
          style={selectStyle}
          aria-label="Ordenar"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {(filtersActive || sort !== 'newest') && (
          <button
            type="button"
            onClick={handleReset}
            className="h-9 text-xs underline"
            style={{ color: 'var(--shop-text-muted)' }}
          >
            Limpiar
          </button>
        )}
      </div>

      {processed.length === 0 ? (
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
                    <ProductCard listing={listing} index={i} shopUsername={shopUsername} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          key={`${query}|${categoryFilter}|${featuredOnly}|${conditionFilter}|${sort}`}
          variants={prefersReduced ? undefined : gridVariants}
          initial={prefersReduced ? undefined : 'hidden'}
          whileInView={prefersReduced ? undefined : 'visible'}
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        >
          {processed.map((listing, i) => (
            <motion.div
              key={listing.id}
              variants={prefersReduced ? undefined : productCardVariants}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <ProductCard listing={listing} index={i} shopUsername={shopUsername} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
