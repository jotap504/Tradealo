'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { shop as shopApi, listings as listingsApi } from '@/lib/api';
import type { Listing, ShopPinnedListing } from '@/types';

export default function PinnedListingsPage() {
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      listingsApi.getMyListings({ status: 'active', limit: 50 }),
      shopApi.getMyShop(),
    ]).then(([listRes, shopData]) => {
      setMyListings(listRes.data);
      setPinned((shopData as unknown as { pinnedListings?: ShopPinnedListing[] }).pinnedListings?.map((p) => p.listingId) ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const togglePin = async (listingId: string) => {
    const isPinned = pinned.includes(listingId);
    if (!isPinned && pinned.length >= 6) { setError('Máximo 6 destacados.'); return; }
    setError('');
    try {
      if (isPinned) {
        await shopApi.unpinListing(listingId);
        setPinned((p) => p.filter((id) => id !== listingId));
      } else {
        await shopApi.pinListing(listingId);
        setPinned((p) => [...p, listingId]);
      }
    } catch {
      setError('No se pudo actualizar.');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">Cargando…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/my-shop" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-tradealo-text">Productos destacados</h1>
          <p className="text-sm text-tradealo-text-muted">{pinned.length}/6 fijados — aparecen primero en tu tienda</p>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      {myListings.length === 0 ? (
        <p className="text-sm text-gray-500">No tenés publicaciones activas.</p>
      ) : (
        <div className="space-y-2">
          {myListings.map((l) => {
            const isPinned = pinned.includes(l.id);
            return (
              <div
                key={l.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${isPinned ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  {l.images?.[0]?.url ? (
                    <Image src={l.images[0].url} alt={l.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900">{l.title}</p>
                  <p className="text-xs text-gray-500">{l.currency} {Number(l.price).toLocaleString('es-AR')}</p>
                </div>
                <button
                  onClick={() => togglePin(l.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isPinned ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {isPinned ? '📌 Fijado' : 'Fijar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
