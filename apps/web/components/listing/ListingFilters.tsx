'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProvinceSelector } from '@/components/ui/ProvinceSelector';
import { CONDITIONS, PAYMENT_METHODS } from '@/lib/constants';
import { categories } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FiltersState {
  q: string;
  category: string;
  province: string;
  city: string;
  conditions: string[];
  paymentMethods: string[];
  saleType: string;
  minPrice: string;
  maxPrice: string;
  currency: string;
  attrs: Record<string, string>;
}

const EMPTY: FiltersState = {
  q: '',
  category: '',
  province: '',
  city: '',
  conditions: [],
  paymentMethods: [],
  saleType: '',
  minPrice: '',
  maxPrice: '',
  currency: '',
  attrs: {},
};

function parseAttrs(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
  } catch {
    /* ignore */
  }
  return {};
}

export function ListingFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FiltersState>(EMPTY);

  useEffect(() => {
    setState({
      q: sp.get('q') ?? '',
      category: sp.get('category') ?? '',
      province: sp.get('province') ?? '',
      city: sp.get('city') ?? '',
      conditions: sp.get('condition')?.split(',').filter(Boolean) ?? [],
      paymentMethods: sp.get('paymentMethods')?.split(',').filter(Boolean) ?? [],
      saleType: sp.get('saleType') ?? '',
      minPrice: sp.get('minPrice') ?? '',
      maxPrice: sp.get('maxPrice') ?? '',
      currency: sp.get('currency') ?? '',
      attrs: parseAttrs(sp.get('attrs')),
    });
  }, [sp]);

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.getCategories(),
  });

  const { data: dynamicAttrs = [] } = useQuery({
    queryKey: ['category', state.category, 'attributes'],
    queryFn: () => categories.getAttributes(state.category),
    enabled: !!state.category,
    staleTime: 5 * 60_000,
  });

  const apply = () => {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);
    if (state.province) params.set('province', state.province);
    if (state.city) params.set('city', state.city);
    if (state.conditions.length)
      params.set('condition', state.conditions.join(','));
    if (state.paymentMethods.length)
      params.set('paymentMethods', state.paymentMethods.join(','));
    if (state.saleType) params.set('saleType', state.saleType);
    if (state.minPrice) params.set('minPrice', state.minPrice);
    if (state.maxPrice) params.set('maxPrice', state.maxPrice);
    if (state.currency) params.set('currency', state.currency);
    const cleanAttrs = Object.fromEntries(
      Object.entries(state.attrs).filter(([, v]) => v && v.length > 0),
    );
    if (Object.keys(cleanAttrs).length > 0) {
      params.set('attrs', JSON.stringify(cleanAttrs));
    }
    router.push(`/listings?${params.toString()}`);
    setOpen(false);
  };

  const reset = () => {
    setState(EMPTY);
    router.push('/listings');
    setOpen(false);
  };

  const flatCats = (cats ?? []).flatMap((c) => [c, ...(c.children ?? [])]);

  return (
    <>
      <div className="lg:hidden">
        <Button
          variant="secondary"
          fullWidth
          leftIcon={<SlidersHorizontal size={16} />}
          onClick={() => setOpen(true)}
        >
          Filtros
        </Button>
      </div>

      <aside
        className={cn(
          'lg:sticky lg:top-20 lg:self-start',
          open ? 'block' : 'hidden lg:block'
        )}
      >
        <div className="lg:bg-white lg:rounded-xl lg:border lg:border-tradealo-border lg:p-5 fixed inset-0 lg:static z-50 bg-white flex flex-col lg:block">
          <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-tradealo-border shrink-0">
            <h3 className="font-heading font-semibold">Filtros</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4 lg:p-0 overflow-y-auto flex-1 lg:overflow-visible space-y-5">
            <div className="hidden lg:block">
              <h3 className="font-heading font-semibold text-base mb-1">
                Filtros
              </h3>
              <p className="text-xs text-tradealo-text-muted">
                Afiná los resultados a tu gusto
              </p>
            </div>

            <Input
              label="Búsqueda"
              leftIcon={<Search size={15} />}
              placeholder="Bicicleta rodado 26…"
              value={state.q}
              onChange={(e) => setState({ ...state, q: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Categoría
              </label>
              <select
                value={state.category}
                onChange={(e) =>
                  setState({ ...state, category: e.target.value })
                }
                className="w-full h-11 rounded-lg border border-tradealo-border px-3 text-sm focus:outline-none focus:border-tradealo-primary focus:ring-2 focus:ring-tradealo-primary-light"
              >
                <option value="">Todas las categorías</option>
                {flatCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <ProvinceSelector
              label="Provincia"
              value={state.province}
              onChange={(e) =>
                setState({ ...state, province: e.target.value })
              }
            />

            <Input
              label="Ciudad"
              placeholder="Ej: Córdoba"
              value={state.city}
              onChange={(e) => setState({ ...state, city: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <div className="space-y-2">
                {CONDITIONS.map((c) => (
                  <label
                    key={c.value}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={state.conditions.includes(c.value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...state.conditions, c.value]
                          : state.conditions.filter((v) => v !== c.value);
                        setState({ ...state, conditions: next });
                      }}
                      className="w-4 h-4 rounded text-tradealo-primary focus:ring-tradealo-primary"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Formas de pago
              </label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={state.paymentMethods.includes(m)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...state.paymentMethods, m]
                          : state.paymentMethods.filter((p) => p !== m);
                        setState({ ...state, paymentMethods: next });
                      }}
                      className="w-4 h-4 rounded text-tradealo-primary focus:ring-tradealo-primary"
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de venta
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-lg">
                {[
                  { v: '', l: 'Todos' },
                  { v: 'contact', l: 'Contacto' },
                  { v: 'stock', l: 'Stock' },
                  { v: 'auction', l: 'Remate' },
                ].map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setState({ ...state, saleType: t.v })}
                    className={cn(
                      'h-8 rounded-md text-xs font-medium transition-colors',
                      state.saleType === t.v
                        ? 'bg-white text-tradealo-primary shadow-sm'
                        : 'text-tradealo-text-muted hover:text-tradealo-text'
                    )}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium mb-2">Precio</label>
              {/* Range values display */}
              <div className="flex items-center justify-between text-xs text-tradealo-text-muted">
                <span>$ {(Number(state.minPrice) || 0).toLocaleString('es-AR')}</span>
                <span>$ {(Number(state.maxPrice) || 1000000).toLocaleString('es-AR')}</span>
              </div>
              {/* Dual range slider */}
              <div className="relative h-6">
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-200 rounded-full" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-tradealo-primary rounded-full"
                  style={{
                    left: `${((Number(state.minPrice) || 0) / 1000000) * 100}%`,
                    width: `${((Number(state.maxPrice) || 1000000) - (Number(state.minPrice) || 0)) / 1000000 * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={1000000}
                  step={100}
                  value={Number(state.minPrice) || 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const max = Number(state.maxPrice) || 1000000;
                    if (v <= max) setState({ ...state, minPrice: String(v) });
                  }}
                  className="absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-tradealo-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-tradealo-primary [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-pointer"
                />
                <input
                  type="range"
                  min={0}
                  max={1000000}
                  step={100}
                  value={Number(state.maxPrice) || 1000000}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const min = Number(state.minPrice) || 0;
                    if (v >= min) setState({ ...state, maxPrice: String(v) });
                  }}
                  className="absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-tradealo-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-tradealo-primary [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Mín"
                  value={state.minPrice}
                  onChange={(e) =>
                    setState({ ...state, minPrice: e.target.value })
                  }
                  className="w-full h-10 rounded-lg border border-tradealo-border px-3 text-sm focus:outline-none focus:border-tradealo-primary"
                />
                <span className="text-tradealo-text-muted">—</span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={state.maxPrice}
                  onChange={(e) =>
                    setState({ ...state, maxPrice: e.target.value })
                  }
                  className="w-full h-10 rounded-lg border border-tradealo-border px-3 text-sm focus:outline-none focus:border-tradealo-primary"
                />
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg">
                {[
                  { v: '', l: 'Ambas' },
                  { v: 'ARS', l: 'Pesos' },
                  { v: 'USD', l: 'Dólares' },
                ].map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    onClick={() => setState({ ...state, currency: c.v })}
                    className={cn(
                      'h-8 rounded-md text-xs font-medium transition-colors',
                      state.currency === c.v
                        ? 'bg-white text-tradealo-primary shadow-sm'
                        : 'text-tradealo-text-muted hover:text-tradealo-text'
                    )}
                  >
                    {c.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {state.category && dynamicAttrs.length > 0 && (
            <div className="p-4 lg:p-0 space-y-3">
              <h4 className="text-xs font-semibold text-tradealo-text-muted uppercase tracking-wide">
                Filtros de categoría
              </h4>
              {dynamicAttrs.map((attr) => {
                const cur = state.attrs[attr.key] ?? '';
                const setAttr = (val: string) =>
                  setState({
                    ...state,
                    attrs: { ...state.attrs, [attr.key]: val },
                  });
                if (attr.type === 'select') {
                  return (
                    <div key={attr.key}>
                      <label className="text-xs text-tradealo-text-muted mb-1 block">
                        {attr.label}
                      </label>
                      <select
                        value={cur}
                        onChange={(e) => setAttr(e.target.value)}
                        className="w-full h-10 rounded-lg border border-tradealo-border px-2 text-sm"
                      >
                        <option value="">Cualquiera</option>
                        {(attr.options?.values ?? []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (attr.type === 'number') {
                  return (
                    <div key={attr.key}>
                      <label className="text-xs text-tradealo-text-muted mb-1 block">
                        {attr.label}
                      </label>
                      <Input
                        type="number"
                        value={cur}
                        onChange={(e) => setAttr(e.target.value)}
                        placeholder="—"
                      />
                    </div>
                  );
                }
                return (
                  <div key={attr.key}>
                    <label className="text-xs text-tradealo-text-muted mb-1 block">
                      {attr.label}
                    </label>
                    <Input
                      value={cur}
                      onChange={(e) => setAttr(e.target.value)}
                      placeholder="—"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="lg:mt-5 p-4 lg:p-0 border-t lg:border-t-0 border-tradealo-border flex gap-2 shrink-0 bg-white">
            <Button variant="secondary" onClick={reset} fullWidth>
              Limpiar
            </Button>
            <Button onClick={apply} fullWidth>
              Aplicar
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
