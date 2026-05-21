'use client';
import { useEffect, useState } from 'react';
import { shop as shopApi } from '@/lib/api';
import type { ShopAnalytics } from '@/types';

export default function ShopAnalyticsPage() {
  const [data, setData] = useState<ShopAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopApi.getAnalytics(30).then(setData).catch(() => null).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">Cargando…</div>;
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No hay datos disponibles todavía.</p>
      </div>
    );
  }

  const metrics = [
    { label: 'Visitas', value: data.pageViews, emoji: '👁️' },
    { label: 'Clics en productos', value: data.listingClicks, emoji: '📦' },
    { label: 'Clics en WhatsApp', value: data.whatsappClicks, emoji: '💬' },
    { label: 'Sesiones chatbot', value: data.chatbotSessions, emoji: '🤖' },
  ];

  const maxViews = Math.max(...(data.byDay?.map((d) => d.pageViews) ?? [1]), 1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <p className="text-sm text-gray-500 mt-1">Últimos 30 días</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-gray-200 p-5 space-y-1">
            <p className="text-2xl">{m.emoji}</p>
            <p className="text-2xl font-bold text-gray-900">{m.value.toLocaleString('es-AR')}</p>
            <p className="text-xs text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>

      {data.byDay?.length > 0 && (
        <div className="rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Visitas por día</h2>
          <div className="flex items-end gap-1 h-28">
            {data.byDay.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full rounded-t-sm transition-all group-hover:opacity-80"
                  style={{
                    height: `${Math.max(4, (d.pageViews / maxViews) * 100)}%`,
                    backgroundColor: '#14b8a6',
                  }}
                  title={`${d.date}: ${d.pageViews} visitas`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{data.byDay[0]?.date?.slice(5)}</span>
            <span>{data.byDay[data.byDay.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
