'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { shopSubscription as subApi } from '@/lib/api';
import type { ShopSubscription } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  trial: 'En prueba',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export default function ShopSubscriptionPage() {
  const [sub, setSub] = useState<ShopSubscription | null | undefined>(undefined);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    subApi.getMine().then(setSub).catch(() => setSub(null));
  }, []);

  const handleSubscribe = async () => {
    setSubscribing(true);
    setError('');
    try {
      const { initPoint } = await subApi.subscribe();
      window.location.href = initPoint;
    } catch {
      setError('No se pudo iniciar la suscripción. Intentá de nuevo.');
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Seguro que querés cancelar tu suscripción? Tu tienda se despublicará.')) return;
    setCancelling(true);
    setError('');
    try {
      await subApi.cancel();
      setSub(null);
    } catch {
      setError('No se pudo cancelar. Intentá de nuevo.');
    } finally {
      setCancelling(false);
    }
  };

  if (sub === undefined) {
    return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">Cargando…</div>;
  }

  const isActive = sub && (sub.status === 'active' || sub.status === 'trial');

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/my-shop" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" aria-label="Volver">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-heading text-xl font-bold text-tradealo-text">Suscripción</h1>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {sub ? (
        <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Estado</span>
            <span className="text-sm font-semibold text-gray-900">{STATUS_LABELS[sub.status] ?? sub.status}</span>
          </div>
          {sub.amountArs && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Monto mensual</span>
              <span className="text-sm text-gray-900">$ {Number(sub.amountArs).toLocaleString('es-AR')}</span>
            </div>
          )}
          {sub.billingCycleEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Próximo cobro</span>
              <span className="text-sm text-gray-900">{new Date(sub.billingCycleEnd).toLocaleDateString('es-AR')}</span>
            </div>
          )}
          {isActive && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full mt-2 py-2 rounded-xl border border-red-300 text-red-600 text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelando…' : 'Cancelar suscripción'}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center space-y-4">
          <div className="text-4xl">🏪</div>
          <h2 className="font-semibold text-gray-800">Tienda Premium</h2>
          <ul className="text-sm text-gray-600 space-y-1 text-left inline-block">
            <li>✅ Subdominio propio en trocalia.ar</li>
            <li>✅ 5 temas visuales</li>
            <li>✅ Galería de fotos</li>
            <li>✅ Chatbot de ventas con IA</li>
            <li>✅ Analytics básico</li>
            <li>✅ SEO personalizado</li>
          </ul>
          <p className="text-2xl font-bold text-gray-900">$ 2.999 / mes</p>
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full py-3 rounded-xl text-white font-semibold bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-50"
          >
            {subscribing ? 'Redirigiendo a MercadoPago…' : 'Suscribirme ahora'}
          </button>
          <p className="text-xs text-gray-400">Podés cancelar en cualquier momento</p>
        </div>
      )}
    </div>
  );
}
