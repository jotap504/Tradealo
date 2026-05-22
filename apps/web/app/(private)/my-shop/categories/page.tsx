'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { shop as shopApi } from '@/lib/api';
import type { Shop } from '@/types';
import { ChevronUp, ChevronDown, ArrowLeft, CheckCircle } from 'lucide-react';

export default function CategoriesPage() {
  const [shopData, setShopData] = useState<Shop | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    shopApi
      .getMyShop()
      .then(async (s) => {
        setShopData(s);
        const savedOrder: string[] = s.categoryOrder ?? [];

        // If shop is published, also fetch live categories from public endpoint
        const identifier = s.slug ?? s.username;
        if (s.isPublished && identifier) {
          try {
            const pub = await shopApi.getPublic(identifier);
            const liveCats = Array.from(
              new Set(pub.allListings.map((l) => l.categoryName).filter(Boolean) as string[])
            );
            // Merge: saved order first, then any new categories not yet in it
            const merged = [...savedOrder];
            for (const cat of liveCats) {
              if (!merged.includes(cat)) merged.push(cat);
            }
            setOrder(merged);
            return;
          } catch {
            // ignore — fall through to just use saved order
          }
        }
        setOrder(savedOrder);
      })
      .catch(() => setError('No se pudo cargar la tienda'))
      .finally(() => setLoading(false));
  }, []);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await shopApi.updateCategoryOrder(order);
      setSaved(true);
    } catch {
      setError('No se pudo guardar el orden. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No tenés tienda configurada aún.</p>
          <Link href="/my-shop" className="text-teal-600 underline">
            Ir a Mi Tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/my-shop"
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Orden de categorías</h1>
            <p className="text-sm text-gray-500">
              Definí el orden en que aparecen las categorías en tu tienda.
            </p>
          </div>
        </div>

        {order.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">
              {shopData.isPublished
                ? 'No tenés productos publicados con categorías asignadas todavía.'
                : 'Publicá tu tienda primero para ver las categorías de tus productos aquí.'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              {order.map((cat, i) => (
                <div
                  key={cat}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
                >
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800 truncate">{cat}</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      aria-label="Subir"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      aria-label="Bajar"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <CheckCircle size={18} />
                  Orden guardado
                </>
              ) : saving ? (
                'Guardando…'
              ) : (
                'Guardar orden'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              Los cambios se ven en tu tienda pública de inmediato.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
