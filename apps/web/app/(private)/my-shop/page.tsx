'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { shop as shopApi, shopSubscription as subApi } from '@/lib/api';
import type { Shop, ShopSubscription } from '@/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Activa', color: '#22c55e' },
  trial: { label: 'Prueba', color: '#3b82f6' },
  paused: { label: 'Pausada', color: '#f59e0b' },
  cancelled: { label: 'Cancelada', color: '#ef4444' },
  expired: { label: 'Expirada', color: '#6b7280' },
};

export default function MyShopPage() {
  const [shopData, setShopData] = useState<Shop | null>(null);
  const [sub, setSub] = useState<ShopSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      shopApi.getMyShop().catch(() => null),
      subApi.getMine().catch(() => null),
    ]).then(([s, su]) => {
      setShopData(s);
      setSub(su);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">Cargando…</div>;
  }

  const hasActiveSub = sub && (sub.status === 'active' || sub.status === 'trial');
  const subInfo = sub ? STATUS_LABELS[sub.status] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Tienda</h1>
        <p className="text-sm text-gray-500 mt-1">Gestioná tu tienda premium en Trocalia</p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-800">Suscripción</h2>
        {sub ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium px-3 py-1 rounded-full text-white" style={{ backgroundColor: subInfo?.color ?? '#6b7280' }}>
              {subInfo?.label ?? sub.status}
            </span>
            {sub.billingCycleEnd && (
              <span className="text-xs text-gray-500">
                Próximo cobro: {new Date(sub.billingCycleEnd).toLocaleDateString('es-AR')}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Sin suscripción activa</span>
            <Link
              href="/my-shop/subscription"
              className="text-sm font-medium px-4 py-1.5 rounded-full text-white bg-teal-500 hover:bg-teal-600 transition-colors"
            >
              Suscribirse
            </Link>
          </div>
        )}
      </div>

      {shopData && (
        <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Estado de la tienda</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${shopData.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {shopData.isPublished ? 'Publicada' : 'No publicada'}
            </span>
          </div>
          <p className="text-sm text-gray-600">{shopData.shopName ?? 'Sin nombre'}</p>
          {shopData.isPublished && (shopData.slug ?? shopData.username) && (
            <a
              href={`/shop/${shopData.slug ?? shopData.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-teal-600 underline"
            >
              Ver mi tienda →
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {hasActiveSub ? (
          <>
            <ManageLink href="/my-shop/edit" label="Editar perfil" emoji="✏️" />
            <ManageLink href="/my-shop/gallery" label="Galería" emoji="🖼️" />
            <ManageLink href="/my-shop/pinned" label="Destacados" emoji="📌" />
            <ManageLink href="/my-shop/analytics" label="Estadísticas" emoji="📊" />
            <ManageLink href="/my-shop/subscription" label="Suscripción" emoji="💳" />
          </>
        ) : (
          <div className="col-span-2 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center space-y-3">
            <p className="text-sm text-gray-500">Activá tu suscripción para acceder a todas las funciones de tu tienda</p>
            <Link
              href="/my-shop/subscription"
              className="inline-block text-sm font-medium px-6 py-2 rounded-full text-white bg-teal-500 hover:bg-teal-600 transition-colors"
            >
              Ver planes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ManageLink({ href, label, emoji }: { href: string; label: string; emoji: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
}
