'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ListingGrid } from '@/components/listing/ListingGrid';
import { ListingFilters } from '@/components/listing/ListingFilters';
import { Suspense } from 'react';
import { listings } from '@/lib/api';
import type { Listing } from '@/types';

function ListingsInner() {
  const sp = useSearchParams();

  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  const queryParams = {
    q: sp.get('q') ?? undefined,
    categoryId: sp.get('category') ?? undefined,
    province: sp.get('province') ?? undefined,
    condition: sp.get('condition') ?? undefined,
    type: sp.get('type') ?? undefined,
    minPrice: sp.get('minPrice') ? Number(sp.get('minPrice')) : undefined,
    maxPrice: sp.get('maxPrice') ? Number(sp.get('maxPrice')) : undefined,
    currency: sp.get('currency') ?? undefined,
    limit: 24,
  };

  const spString = sp.toString();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['listings', queryParams],
    queryFn: () => listings.getListings(queryParams),
    staleTime: 60_000,
  });

  useEffect(() => {
    setAllListings([]);
    setCursor(undefined);
    setHasMore(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spString]);

  useEffect(() => {
    if (data) {
      setAllListings(data.data ?? []);
      setHasMore(!!data.nextCursor);
      setCursor(data.nextCursor);
    }
  }, [data]);

  const loadMore = useCallback(async () => {
    if (!cursor || isFetching) return;
    try {
      const more = await listings.getListings({ ...queryParams, cursor });
      setAllListings((prev) => [...prev, ...(more.data ?? [])]);
      setHasMore(!!more.nextCursor);
      setCursor(more.nextCursor);
    } catch {
      // silently fail
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, isFetching]);

  const q = sp.get('q');
  const title = q ? `Resultados para "${q}"` : 'Todas las publicaciones';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">{title}</h1>
        {data?.total !== undefined && (
          <p className="text-sm text-tradealo-text-muted mt-1">
            {data.total.toLocaleString('es-AR')} publicaciones encontradas
          </p>
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar desktop */}
        <div className="hidden lg:block w-72 shrink-0">
          <ListingFilters />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile filters */}
          <div className="lg:hidden">
            <ListingFilters />
          </div>

          <ListingGrid
            listings={allListings}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            cols={3}
            emptyTitle="No encontramos publicaciones"
            emptyMessage="Probá ajustar los filtros o buscá otra cosa."
          />
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tradealo-bg" />}>
      <ListingsInner />
    </Suspense>
  );
}
