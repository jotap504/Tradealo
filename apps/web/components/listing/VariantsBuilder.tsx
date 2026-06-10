'use client';

import { useEffect, useMemo, useState } from 'react';
import type { VariantInput } from '@/lib/api';
import type { CategoryAttribute } from '@/types';

interface Props {
  attributes: CategoryAttribute[];
  value: VariantInput[];
  onChange: (variants: VariantInput[]) => void;
}

const MAX_DIMENSIONS = 3;

interface CellState {
  key: string;
  attributeValues: Record<string, string>;
  stock: string;
  price: string;
  sku: string;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  isActive: boolean;
}

function combinations(
  dims: Array<{ key: string; values: string[] }>,
): Array<Record<string, string>> {
  if (dims.length === 0) return [];
  let acc: Array<Record<string, string>> = [{}];
  for (const d of dims) {
    const next: Array<Record<string, string>> = [];
    for (const partial of acc) {
      for (const v of d.values) {
        next.push({ ...partial, [d.key]: v });
      }
    }
    acc = next;
  }
  return acc;
}

function cellKey(values: Record<string, string>): string {
  return Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('|');
}

function variantToCell(v: VariantInput): CellState {
  return {
    key: cellKey(v.attributeValues),
    attributeValues: v.attributeValues,
    stock: String(v.stock ?? 0),
    price: v.price != null ? String(v.price) : '',
    sku: v.sku ?? '',
    weightGrams: v.weightGrams != null ? String(v.weightGrams) : '',
    lengthCm: v.lengthCm != null ? String(v.lengthCm) : '',
    widthCm: v.widthCm != null ? String(v.widthCm) : '',
    heightCm: v.heightCm != null ? String(v.heightCm) : '',
    isActive: v.isActive ?? true,
  };
}

function cellToVariant(c: CellState): VariantInput {
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
  return {
    attributeValues: c.attributeValues,
    stock: Number(c.stock) || 0,
    sku: c.sku.trim() || undefined,
    price: num(c.price),
    weightGrams: num(c.weightGrams),
    lengthCm: num(c.lengthCm),
    widthCm: num(c.widthCm),
    heightCm: num(c.heightCm),
    isActive: c.isActive,
  };
}

export function VariantsBuilder({ attributes, value, onChange }: Props) {
  const variantable = useMemo(
    () => attributes.filter((a) => a.isVariant && a.options?.values?.length),
    [attributes],
  );

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    if (value.length > 0) {
      return Object.keys(value[0].attributeValues);
    }
    return variantable.slice(0, 2).map((a) => a.key);
  });

  const [valuesByDim, setValuesByDim] = useState<Record<string, string[]>>(
    () => {
      const init: Record<string, string[]> = {};
      for (const a of variantable) {
        const fromExisting = new Set<string>();
        for (const v of value) {
          const cur = v.attributeValues[a.key];
          if (cur) fromExisting.add(cur);
        }
        init[a.key] = Array.from(fromExisting);
      }
      return init;
    },
  );

  const dims = selectedKeys
    .slice(0, MAX_DIMENSIONS)
    .map((k) => ({
      key: k,
      values: valuesByDim[k] ?? [],
      attribute: variantable.find((a) => a.key === k),
    }))
    .filter((d) => d.attribute && d.values.length > 0);

  const combos = useMemo(
    () => combinations(dims.map((d) => ({ key: d.key, values: d.values }))),
    [dims],
  );

  const [cells, setCells] = useState<Map<string, CellState>>(() => {
    const m = new Map<string, CellState>();
    for (const v of value) m.set(cellKey(v.attributeValues), variantToCell(v));
    return m;
  });

  useEffect(() => {
    setCells((prev) => {
      const next = new Map<string, CellState>();
      for (const c of combos) {
        const k = cellKey(c);
        next.set(
          k,
          prev.get(k) ?? {
            key: k,
            attributeValues: c,
            stock: '0',
            price: '',
            sku: '',
            weightGrams: '',
            lengthCm: '',
            widthCm: '',
            heightCm: '',
            isActive: true,
          },
        );
      }
      return next;
    });
  }, [combos]);

  useEffect(() => {
    const list = Array.from(cells.values()).map(cellToVariant);
    onChange(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells]);

  const toggleDimension = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : prev.length >= MAX_DIMENSIONS
          ? prev
          : [...prev, key],
    );
  };

  const toggleValue = (dimKey: string, value: string) => {
    setValuesByDim((prev) => {
      const arr = prev[dimKey] ?? [];
      return {
        ...prev,
        [dimKey]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const updateCell = (k: string, patch: Partial<CellState>) => {
    setCells((prev) => {
      const next = new Map(prev);
      const cur = next.get(k);
      if (cur) next.set(k, { ...cur, ...patch });
      return next;
    });
  };

  if (variantable.length === 0) {
    return (
      <div className="text-sm text-tradealo-text-muted bg-gray-50 rounded-lg p-3">
        Esta categoría no tiene atributos de variante configurados. Si tu
        producto tiene múltiples opciones (talle, color, etc.), asegurate de
        haber seleccionado la subcategoría correcta.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-tradealo-text mb-2">
          Dimensiones (máx {MAX_DIMENSIONS})
        </p>
        <div className="flex flex-wrap gap-2">
          {variantable.map((a) => {
            const active = selectedKeys.includes(a.key);
            const disabled = !active && selectedKeys.length >= MAX_DIMENSIONS;
            return (
              <button
                key={a.key}
                type="button"
                disabled={disabled}
                onClick={() => toggleDimension(a.key)}
                className={`h-9 px-3 rounded-full text-sm border transition-colors ${
                  active
                    ? 'bg-tradealo-primary text-white border-tradealo-primary'
                    : 'bg-white text-tradealo-text border-tradealo-border'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedKeys.map((k) => {
        const a = variantable.find((x) => x.key === k);
        if (!a) return null;
        const opts = a.options?.values ?? [];
        const selected = valuesByDim[k] ?? [];
        return (
          <div key={k}>
            <p className="text-xs text-tradealo-text-muted mb-1">{a.label}</p>
            <div className="flex flex-wrap gap-2">
              {opts.map((v) => {
                const on = selected.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleValue(k, v)}
                    className={`h-8 px-3 rounded-lg text-xs border ${
                      on
                        ? 'bg-tradealo-primary/10 text-tradealo-primary border-tradealo-primary'
                        : 'bg-white text-tradealo-text border-tradealo-border'
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {combos.length > 0 && (
        <div>
          <p className="text-sm font-medium text-tradealo-text mb-2">
            Variantes ({combos.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-tradealo-border">
                  {dims.map((d) => (
                    <th
                      key={d.key}
                      className="text-left py-2 pr-2 text-tradealo-text-muted"
                    >
                      {d.attribute?.label}
                    </th>
                  ))}
                  <th className="text-left py-2 pr-2">Stock</th>
                  <th className="text-left py-2 pr-2">Precio</th>
                  <th className="text-left py-2 pr-2">SKU</th>
                  <th className="text-left py-2 pr-2">Peso (g)</th>
                </tr>
              </thead>
              <tbody>
                {combos.map((c) => {
                  const k = cellKey(c);
                  const cell = cells.get(k);
                  if (!cell) return null;
                  return (
                    <tr key={k} className="border-b border-tradealo-border">
                      {dims.map((d) => (
                        <td
                          key={d.key}
                          className="py-2 pr-2 font-medium text-tradealo-text"
                        >
                          {c[d.key]}
                        </td>
                      ))}
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={cell.stock}
                          onChange={(e) =>
                            updateCell(k, { stock: e.target.value })
                          }
                          className="w-16 h-8 rounded border border-tradealo-border px-1 text-xs"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={cell.price}
                          placeholder="—"
                          onChange={(e) =>
                            updateCell(k, { price: e.target.value })
                          }
                          className="w-20 h-8 rounded border border-tradealo-border px-1 text-xs"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={cell.sku}
                          onChange={(e) =>
                            updateCell(k, { sku: e.target.value })
                          }
                          className="w-24 h-8 rounded border border-tradealo-border px-1 text-xs"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={cell.weightGrams}
                          onChange={(e) =>
                            updateCell(k, { weightGrams: e.target.value })
                          }
                          className="w-20 h-8 rounded border border-tradealo-border px-1 text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-tradealo-text-muted mt-2">
            Precio vacío = usa el precio principal de la publicación.
          </p>
        </div>
      )}
    </div>
  );
}
