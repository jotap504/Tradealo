'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listingVariants as variantsApi,
  categories as catsApi,
  type ListingVariant,
} from '@/lib/api';
import { VariantSelector } from './VariantSelector';

interface Props {
  listingId: string;
  categoryId?: string | null;
  basePrice: number;
  currency: 'ARS' | 'USD';
  onSelectedChange?: (variant: ListingVariant | null) => void;
  onVariantsLoaded?: (count: number) => void;
}

export function ListingVariantsBlock({
  listingId,
  categoryId,
  basePrice,
  currency,
  onSelectedChange,
  onVariantsLoaded,
}: Props) {
  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['listing', listingId, 'variants', 'public'],
    queryFn: () => variantsApi.listPublic(listingId),
    staleTime: 60_000,
  });

  const { data: attributes = [] } = useQuery({
    queryKey: ['category', categoryId, 'attributes'],
    queryFn: () => catsApi.getAttributes(categoryId!),
    enabled: !!categoryId,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!isLoading) {
      onVariantsLoaded?.(variants.length);
      if (variants.length > 0) onSelectedChange?.(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, variants.length]);

  if (isLoading) return null;
  if (!variants || variants.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-tradealo-border p-5 space-y-3">
      <h3 className="font-heading font-semibold text-sm">Elegí tu variante</h3>
      <VariantSelector
        variants={variants}
        attributes={attributes}
        basePrice={basePrice}
        currency={currency}
        onSelectedChange={onSelectedChange}
      />
    </div>
  );
}
