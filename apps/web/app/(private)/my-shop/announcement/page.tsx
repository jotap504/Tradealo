'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Megaphone, Trash2, Check, AlertCircle, Clock } from 'lucide-react';
import { shop as shopApi } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Shop } from '@/types';

const MAX_CHARS = 500;

function formatLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AnnouncementStatus({ text, expiresAt }: { text: string | null; expiresAt: string | null }) {
  if (!text) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Sin anuncio activo
      </span>
    );
  }
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
        <AlertCircle size={12} />
        Vencido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Activo
    </span>
  );
}

export default function AnnouncementPage() {
  const router = useRouter();
  const [shopData, setShopData] = useState<Shop | null>(null);
  const [text, setText] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    shopApi.getMyShop().then((s) => {
      setShopData(s);
      setText(s.announcementText ?? '');
      setExpiresAt(s.announcementExpiresAt ? formatLocalDatetime(s.announcementExpiresAt) : '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!text.trim()) { setError('El texto del anuncio no puede estar vacío.'); return; }
    setError('');
    setSaving(true);
    try {
      await shopApi.setAnnouncement({
        text: text.trim(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!confirm('¿Eliminar el anuncio actual?')) return;
    setSaving(true);
    try {
      await shopApi.setAnnouncement({ text: null, expiresAt: null });
      setText('');
      setExpiresAt('');
      setShopData((prev) => prev ? { ...prev, announcementText: null, announcementExpiresAt: null } : prev);
    } catch {
      setError('No se pudo eliminar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/3 animate-pulse" />
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const previewColor = (shopData as Shop & { primaryColor?: string | null })?.primaryColor ?? '#14b8a6';
  const isExpired = shopData?.announcementExpiresAt && new Date(shopData.announcementExpiresAt) < new Date();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Megaphone size={22} className="text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">Anuncio / Campaña</h1>
        </div>
        <div className="ml-auto">
          <AnnouncementStatus
            text={shopData?.announcementText ?? null}
            expiresAt={shopData?.announcementExpiresAt ?? null}
          />
        </div>
      </div>

      <p className="text-gray-500 text-sm">
        Aparece como una barra destacada en la parte superior de tu tienda. Ideal para Hot Sale, descuentos o novedades.
      </p>

      {/* Live preview */}
      {text && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm"
          style={{ backgroundColor: previewColor, color: '#fff' }}
        >
          <span className="flex-1 text-center">{text}</span>
          <span className="shrink-0 opacity-60 text-lg leading-none cursor-default">✕</span>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <span className="font-semibold text-gray-700">Texto del anuncio</span>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              rows={3}
              placeholder="¡Hot Sale! 20% de descuento en todos los productos hasta el domingo."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{text.length}/{MAX_CHARS}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
              <Clock size={14} />
              Fecha de vencimiento{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
            {expiresAt && (
              <p className="text-xs text-gray-400">
                El anuncio se ocultará automáticamente cuando venza.
              </p>
            )}
            {isExpired && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle size={12} />
                Este anuncio ya venció y no es visible para los visitantes.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !text.trim()} className="flex-1">
          {saved ? (
            <><Check size={16} className="mr-2" />Guardado</>
          ) : saving ? (
            'Guardando...'
          ) : (
            'Publicar anuncio'
          )}
        </Button>
        {shopData?.announcementText && (
          <Button variant="danger" onClick={handleClear} disabled={saving}>
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
