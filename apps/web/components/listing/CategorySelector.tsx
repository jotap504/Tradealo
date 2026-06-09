'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, Search } from 'lucide-react';
import { categories as catsApi, type CategoryNode } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

interface Props {
  value?: string;
  onChange: (
    categoryId: string,
    isCollectible: boolean,
    attributes?: Category['attributes'],
  ) => void;
}

interface FlatRow {
  node: CategoryNode;
  pathLabel: string;
}

function flatten(nodes: CategoryNode[], trail: string[] = []): FlatRow[] {
  const out: FlatRow[] = [];
  for (const n of nodes) {
    const here = [...trail, n.name];
    out.push({ node: n, pathLabel: here.join(' › ') });
    if (n.children?.length) out.push(...flatten(n.children, here));
  }
  return out;
}

export function CategorySelector({ value, onChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => catsApi.getTree(),
  });

  const tree = data ?? [];
  const [stack, setStack] = useState<CategoryNode[]>([]);
  const [query, setQuery] = useState('');

  const flat = useMemo(() => flatten(tree), [tree]);
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return flat
      .filter(
        (r) =>
          r.node.name.toLowerCase().includes(q) ||
          r.pathLabel.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [flat, query]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-tradealo-text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const current: CategoryNode[] =
    stack.length === 0 ? tree : (stack[stack.length - 1].children ?? []);

  const pick = (n: CategoryNode) => {
    if (n.children && n.children.length > 0) {
      setStack((prev) => [...prev, n]);
      setQuery('');
      return;
    }
    onChange(n.id, !!n.isCollectible, undefined);
  };

  const breadcrumb = stack.map((s) => s.name);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-tradealo-text-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar categoría (ej. zapatillas, mtb, ...)"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-tradealo-border text-sm focus:outline-none focus:border-tradealo-primary"
        />
      </div>

      {query.trim().length >= 2 ? (
        <div className="space-y-1">
          {searchResults.length === 0 ? (
            <p className="text-sm text-tradealo-text-muted py-4 text-center">
              Sin resultados para &quot;{query}&quot;
            </p>
          ) : (
            searchResults.map((r) => (
              <button
                key={r.node.id}
                type="button"
                onClick={() => {
                  setQuery('');
                  setStack([]);
                  onChange(r.node.id, !!r.node.isCollectible, undefined);
                }}
                className={cn(
                  'w-full text-left p-3 rounded-lg border bg-white hover:border-tradealo-primary transition-colors',
                  value === r.node.id
                    ? 'border-tradealo-primary bg-tradealo-primary-light'
                    : 'border-tradealo-border',
                )}
              >
                <p className="text-sm font-medium text-tradealo-text">
                  {r.node.name}
                </p>
                <p className="text-xs text-tradealo-text-muted">
                  {r.pathLabel}
                </p>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {breadcrumb.length > 0 && (
            <nav className="flex items-center gap-1 text-sm flex-wrap">
              <button
                type="button"
                onClick={() => setStack([])}
                className="text-tradealo-primary hover:underline"
              >
                Categorías
              </button>
              {breadcrumb.map((b, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-tradealo-text-muted"
                >
                  <ChevronRight size={14} />
                  <button
                    type="button"
                    onClick={() => setStack((prev) => prev.slice(0, i + 1))}
                    className={cn(
                      'font-medium',
                      i === breadcrumb.length - 1
                        ? 'text-tradealo-text'
                        : 'text-tradealo-primary hover:underline',
                    )}
                  >
                    {b}
                  </button>
                </span>
              ))}
            </nav>
          )}

          <div
            className={cn(
              'grid gap-2',
              stack.length === 0
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2',
            )}
          >
            {current.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => pick(n)}
                className={cn(
                  'flex items-center justify-between gap-2 p-3 rounded-lg border bg-white text-left transition-all',
                  'border-tradealo-border hover:border-tradealo-primary',
                  value === n.id &&
                    'border-tradealo-primary bg-tradealo-primary-light',
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-tradealo-text truncate">
                    {n.name}
                  </p>
                  {n.isCollectible && (
                    <p className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold mt-0.5">
                      Coleccionable
                    </p>
                  )}
                </div>
                {n.children && n.children.length > 0 ? (
                  <ChevronRight
                    size={16}
                    className="text-tradealo-text-muted shrink-0"
                  />
                ) : null}
              </button>
            ))}
          </div>

          {stack.length > 0 && current.length === 0 && (
            <button
              type="button"
              onClick={() => {
                const last = stack[stack.length - 1];
                onChange(last.id, !!last.isCollectible, undefined);
              }}
              className="w-full p-4 rounded-lg border-2 border-tradealo-primary bg-tradealo-primary-light text-tradealo-primary-hover font-medium"
            >
              Seleccionar {stack[stack.length - 1].name}
            </button>
          )}
        </>
      )}
    </div>
  );
}
