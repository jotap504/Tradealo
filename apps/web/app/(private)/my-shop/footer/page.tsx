'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { shop as shopApi } from '@/lib/api';
import type { Shop } from '@/types';
import type { FooterConfig } from '@/components/shop/footers/types';

type FooterTemplate = 'none' | 'columnas' | 'compact' | 'expandido';

interface FooterMeta {
  id: FooterTemplate;
  label: string;
  description: string;
  preview: React.ReactNode;
}

const FOOTER_META: FooterMeta[] = [
  {
    id: 'columnas',
    label: '3 columnas · Fondo oscuro',
    description: 'Tres columnas con logo, contacto y horarios sobre fondo oscuro.',
    preview: (
      <div className="relative w-full h-28 overflow-hidden rounded-lg bg-slate-900 border border-slate-800">
        <div className="grid grid-cols-3 gap-2 p-3 h-full">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-teal-500/80" />
              <div className="h-1.5 w-10 bg-white/70 rounded" />
            </div>
            <div className="h-1 w-12 bg-white/30 rounded" />
            <div className="flex gap-1 mt-2">
              <div className="w-3 h-3 rounded-full bg-white/15" />
              <div className="w-3 h-3 rounded-full bg-white/15" />
              <div className="w-3 h-3 rounded-full bg-white/15" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-8 bg-teal-400/80 rounded" />
            <div className="h-1 w-full bg-white/25 rounded" />
            <div className="h-1 w-3/4 bg-white/25 rounded" />
            <div className="h-1 w-5/6 bg-white/25 rounded" />
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-8 bg-teal-400/80 rounded" />
            <div className="flex justify-between">
              <div className="h-1 w-6 bg-white/40 rounded" />
              <div className="h-1 w-8 bg-white/25 rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-1 w-6 bg-white/40 rounded" />
              <div className="h-1 w-8 bg-white/25 rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-1 w-6 bg-white/40 rounded" />
              <div className="h-1 w-8 bg-white/25 rounded" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 h-3 bg-slate-950/80" />
      </div>
    ),
  },
  {
    id: 'compact',
    label: 'Banda compacta · Minimalista',
    description: 'Una sola fila con logo, redes sociales y datos de contacto.',
    preview: (
      <div className="relative w-full h-28 overflow-hidden rounded-lg bg-white border border-gray-200">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-teal-500" />
        <div className="flex items-center justify-between h-full px-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-teal-100" />
            <div className="space-y-1">
              <div className="h-1.5 w-14 bg-gray-700 rounded" />
              <div className="h-1 w-10 bg-gray-300 rounded" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200" />
            <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200" />
            <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200" />
            <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200" />
          </div>
          <div className="space-y-1">
            <div className="h-1 w-16 bg-gray-400 rounded" />
            <div className="h-1 w-14 bg-gray-400 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'expandido',
    label: 'Footer completo · Con mapa',
    description: 'Versión completa: tres columnas con mapa embebido y franja inferior oscura.',
    preview: (
      <div className="relative w-full h-28 overflow-hidden rounded-lg bg-gray-50 border border-gray-200">
        <div className="grid grid-cols-3 gap-2 p-2.5 h-[80%]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-teal-200" />
              <div className="h-1.5 w-10 bg-gray-700 rounded" />
            </div>
            <div className="h-1 w-full bg-gray-300 rounded" />
            <div className="flex gap-1 mt-1.5">
              <div className="h-3 w-6 rounded-full bg-white border border-gray-200" />
              <div className="h-3 w-6 rounded-full bg-white border border-gray-200" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-8 bg-teal-500 rounded" />
            <div className="h-1 w-3/4 bg-gray-300 rounded" />
            <div className="h-1 w-5/6 bg-gray-300 rounded" />
            <div className="h-1 w-2/3 bg-gray-300 rounded" />
          </div>
          <div className="relative h-full rounded bg-gradient-to-br from-teal-100 via-emerald-50 to-blue-50 border border-gray-200 overflow-hidden">
            <div className="absolute inset-0 opacity-50">
              <div className="absolute left-2 top-2 w-1 h-1 bg-rose-500 rounded-full" />
              <div className="absolute left-4 top-4 w-2 h-2 rounded-full bg-rose-500/30" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-slate-900 flex items-center justify-between px-2">
          <div className="h-1 w-16 bg-white/30 rounded" />
          <div className="h-1 w-10 bg-white/20 rounded" />
        </div>
      </div>
    ),
  },
];

const NONE_META: FooterMeta = {
  id: 'none',
  label: 'Sin footer',
  description: 'No mostrar ningún footer en la tienda.',
  preview: (
    <div className="relative w-full h-28 overflow-hidden rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
      <span className="text-xs text-gray-400 font-medium">Sin footer</span>
    </div>
  ),
};

const ALL_META = [NONE_META, ...FOOTER_META];

export default function FooterPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FooterTemplate>('none');
  const [config, setConfig] = useState<FooterConfig>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shopApi
      .getMyShop()
      .then((s) => {
        if (s) {
          setShop(s);
          setSelected((s.footerTemplate ?? 'none') as FooterTemplate);
          setConfig((s.footerConfig as FooterConfig | null) ?? {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function updateConfig<K extends keyof FooterConfig>(
    key: K,
    value: FooterConfig[K],
  ) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await shopApi.updateFooterTemplate(
        selected,
        config as Record<string, unknown>,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const needsConfig = selected !== 'none';
  const showsHoursToggle = selected === 'columnas' || selected === 'expandido';
  const showsMapToggle = selected === 'expandido';

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/my-shop"
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-bold text-xl text-gray-900">Footer / Pie de página</h1>
          <p className="text-sm text-gray-500">
            Elegí el estilo y datos de contacto que se mostrarán al pie de la tienda
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ALL_META.map((meta) => (
          <button
            key={meta.id}
            type="button"
            onClick={() => {
              setSelected(meta.id);
              setSaved(false);
            }}
            className={`text-left rounded-xl border-2 p-4 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              selected === meta.id
                ? 'border-teal-500 bg-teal-50/60 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="mb-3">{meta.preview}</div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">{meta.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {meta.description}
                </p>
              </div>
              {selected === meta.id && (
                <div className="shrink-0 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center mt-0.5">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {needsConfig && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-base text-gray-900">
            Configurar: {ALL_META.find((m) => m.id === selected)?.label}
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de contacto
            </label>
            <input
              type="email"
              value={config.email ?? ''}
              onChange={(e) => updateConfig('email', e.target.value)}
              placeholder="contacto@mitienda.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={config.phone ?? ''}
              onChange={(e) => updateConfig('phone', e.target.value)}
              placeholder="+54 9 11 1234-5678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              maxLength={40}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={config.address ?? ''}
              onChange={(e) => updateConfig('address', e.target.value)}
              placeholder="Av. Corrientes 1234, CABA"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tagline personalizado <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={config.customTagline ?? ''}
              onChange={(e) => updateConfig('customTagline', e.target.value)}
              placeholder="Frase corta que aparecerá en el footer"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              maxLength={140}
            />
            <p className="text-xs text-gray-400 mt-1">
              Si lo dejás vacío, se usará el tagline de tu tienda.
            </p>
          </div>

          {showsMapToggle && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL del mapa de Google Maps
              </label>
              <input
                type="url"
                value={config.mapEmbedUrl ?? ''}
                onChange={(e) => updateConfig('mapEmbedUrl', e.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={1000}
              />
              <p className="text-xs text-gray-400 mt-1">
                Usá la URL del atributo <code className="font-mono">src</code> del iframe
                de embed de Google Maps.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {showsMapToggle && (
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={!!config.showMap}
                  onChange={(e) => updateConfig('showMap', e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-gray-700">Mostrar mapa en el footer</span>
              </label>
            )}
            {showsHoursToggle && (
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={!!config.showHours}
                  onChange={(e) => updateConfig('showHours', e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-gray-700">
                  Mostrar horarios de atención
                  <span className="text-xs text-gray-400 ml-1">
                    (se toman de la configuración del perfil)
                  </span>
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !shop}
          className="px-6 py-2.5 rounded-lg bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar footer'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-teal-600 font-medium">
            <Check size={15} strokeWidth={2.5} />
            Guardado
          </span>
        )}
      </div>

      {!shop && <p className="text-sm text-gray-500">No tenés tienda creada aún.</p>}
    </div>
  );
}
