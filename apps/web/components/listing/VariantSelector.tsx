'use client';

import { useMemo, useState } from 'react';
import type { ListingVariant } from '@/lib/api';
import type { CategoryAttribute } from '@/types';

interface Props {
  variants: ListingVariant[];
  attributes?: CategoryAttribute[];
  basePrice: number;
  currency: 'ARS' | 'USD';
  onSelectedChange?: (variant: ListingVariant | null) => void;
}

function labelFor(
  key: string,
  attrs: CategoryAttribute[] | undefined,
): string {
  return attrs?.find((a) => a.key === key)?.label ?? key;
}

export function VariantSelector({
  variants,
  attributes,
  basePrice,
  currency,
  onSelectedChange,
}: Props) {
  const dims = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of variants) {
      for (const [k, val] of Object.entries(v.attributeValues)) {
        const s = map.get(k) ?? new Set<string>();
        s.add(val);
        map.set(k, s);
      }
    }
    return Array.from(map, ([k, vals]) => ({
      key: k,
      values: Array.from(vals),
    }));
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>({});

  const matched = useMemo(() => {
    if (Object.keys(selected).length !== dims.length) return null;
    return (
      variants.find((v) =>
        Object.entries(selected).every(
          ([k, val]) => v.attributeValues[k] === val,
        ),
      ) ?? null
    );
  }, [selected, variants, dims.length]);

  const stock = matched?.stock ?? null;
  const price = matched?.price != null ? Number(matched.price) : basePrice;
  const sym = currency === 'USD' ? 'U$D' : '$';

  const setValue = (key: string, val: string) => {
    const next = { ...selected };
    if (next[key] === val) delete next[key];
    else next[key] = val;
    setSelected(next);
    const m =
      Object.keys(next).length === dims.length
        ? variants.find((v) =>
            Object.entries(next).every(
              ([k, vv]) => v.attributeValues[k] === vv,
            ),
          )
        : null;
    onSelectedChange?.(m ?? null);
  };

  const isAvailable = (key: string, val: string): boolean => {
    return variants.some(
      (v) =>
        v.attributeValues[key] === val &&
        v.isActive &&
        v.stock > 0 &&
        Object.entries(selected).every(
          ([k, vv]) => k === key || v.attributeValues[k] === vv,
        ),
    );
  };

  if (variants.length === 0) return null;

  return (
    <div className="space-y-3">
      {dims.map((d) => (
        <div key={d.key}>
          <p className="text-xs text-tradealo-text-muted mb-1">
            {labelFor(d.key, attributes)}
          </p>
          <div className="flex flex-wrap gap-2">
            {d.values.map((v) => {
              const on = selected[d.key] === v;
              const avail = isAvailable(d.key, v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValue(d.key, v)}
                  className={`h-9 px-3 rounded-lg text-sm border transition-colors ${
                    on
                      ? 'bg-tradealo-primary text-white border-tradealo-primary'
                      : avail
                        ? 'bg-white text-tradealo-text border-tradealo-border hover:border-tradealo-primary'
                        : 'bg-gray-50 text-tradealo-text-muted border-tradealo-border line-through opacity-60'
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-baseline justify-between gap-3 pt-2 border-t border-tradealo-border">
        <span className="text-xl font-bold text-tradealo-text">
          {sym} {price.toLocaleString('es-AR')}
        </span>
        {matched ? (
          stock != null && stock > 0 ? (
            <span className="text-xs text-emerald-600 font-medium">
              {stock} disponible{stock === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-xs text-red-600 font-medium">Sin stock</span>
          )
        ) : (
          <span className="text-xs text-tradealo-text-muted">
            Elegí una opción
          </span>
        )}
      </div>
    </div>
  );
}
