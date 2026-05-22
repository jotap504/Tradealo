'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { shop as shopApi } from '@/lib/api';
import type { Shop } from '@/types';

type HeroTemplate = 'classic' | 'geometric' | 'text-rotate' | 'lamp' | 'video';

interface HeroMeta {
  id: HeroTemplate;
  label: string;
  description: string;
  fields: string;
  preview: React.ReactNode;
}

const HERO_META: HeroMeta[] = [
  {
    id: 'classic',
    label: 'Clásico',
    description: 'Banner de fondo con logo, nombre y redes sociales superpuestos.',
    fields: 'Sin configuración extra',
    preview: (
      <div className="relative w-full h-28 overflow-hidden rounded-lg bg-gradient-to-br from-teal-600 to-indigo-700">
        <div className="absolute bottom-3 left-3 flex items-end gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/30 border border-white/40" />
          <div>
            <div className="h-2.5 w-20 bg-white/80 rounded mb-1" />
            <div className="h-2 w-14 bg-white/50 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'geometric',
    label: 'Geométrico',
    description: 'Fondo oscuro con formas flotantes y texto en gradiente.',
    fields: 'Badge, Título 1, Título 2',
    preview: (
      <div className="relative w-full h-28 overflow-hidden rounded-lg bg-[#030303]">
        <div className="absolute top-3 left-[-10%] w-32 h-8 rounded-full bg-indigo-500/20 border border-white/10" style={{ transform: 'rotate(12deg)' }} />
        <div className="absolute top-8 right-[-5%] w-24 h-6 rounded-full bg-rose-500/20 border border-white/10" style={{ transform: 'rotate(-15deg)' }} />
        <div className="absolute bottom-3 left-[-5%] w-16 h-5 rounded-full bg-violet-500/20 border border-white/10" style={{ transform: 'rotate(-8deg)' }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3">
          <div className="h-2 w-16 bg-white/20 rounded-full" />
          <div className="h-4 w-28 bg-gradient-to-r from-white/80 to-white/60 rounded mt-1" />
          <div className="h-3 w-20 bg-gradient-to-r from-indigo-300/80 to-rose-300/80 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'text-rotate',
    label: 'Texto Rotante',
    description: 'Fondo claro con una palabra que cambia con animación spring.',
    fields: 'Prefijo, Palabras (una por línea)',
    preview: (
      <div className="relative w-full h-28 overflow-hidden rounded-lg bg-white border border-gray-100">
        <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-100" />
          <div className="h-2.5 w-16 bg-gray-300 rounded" />
        </div>
        <div className="absolute bottom-4 left-4 flex items-baseline gap-2">
          <div className="h-4 w-16 bg-gray-800/80 rounded" />
          <div className="h-5 w-14 bg-teal-500 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'lamp',
    label: 'Lámpara',
    description: 'Fondo oscuro con haz de luz cenital y título elegante.',
    fields: 'Título',
    preview: (
      <div className="relative w-full h-28 overflow-hidden rounded-lg bg-slate-950">
        <div
          className="absolute inset-x-0 top-0 h-16"
          style={{ background: 'conic-gradient(from 260deg at 50% 0%, transparent 0deg, rgba(6,182,212,0.30) 60deg, transparent 120deg)' }}
        />
        <div className="absolute inset-x-0 top-8 h-px bg-cyan-400/60" />
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <div className="h-3 w-24 bg-gradient-to-r from-slate-400/80 to-slate-600/80 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'video',
    label: 'Video',
    description: 'Video de fondo (o banner) con palabras rotantes superpuestas.',
    fields: 'URL de video (opcional), Prefijo, Palabras, Descripción',
    preview: (
      <div className="relative w-full h-28 overflow-hidden rounded-lg bg-gradient-to-br from-gray-900 to-black">
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3">
          <div className="flex items-baseline gap-2">
            <div className="h-3 w-14 bg-white/70 rounded" />
            <div className="h-4 w-16 rounded bg-teal-500" />
          </div>
          <div className="h-2 w-24 bg-white/40 rounded" />
        </div>
        <div className="absolute bottom-3 left-3 flex items-end gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30" />
          <div className="h-2 w-16 bg-white/50 rounded" />
        </div>
      </div>
    ),
  },
];

function GeometricForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Badge (texto pequeño sobre el título)</label>
        <input type="text" value={(config.badge as string) ?? ''} onChange={(e) => onChange('badge', e.target.value)} placeholder="Ej: Tienda Oficial" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" maxLength={60} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título 1 (línea principal)</label>
        <input type="text" value={(config.title1 as string) ?? ''} onChange={(e) => onChange('title1', e.target.value)} placeholder="Ej: Moda & Estilo" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" maxLength={80} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título 2 (línea en gradiente)</label>
        <input type="text" value={(config.title2 as string) ?? ''} onChange={(e) => onChange('title2', e.target.value)} placeholder="Ej: Lo mejor de Argentina" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" maxLength={80} />
      </div>
    </div>
  );
}

function TextRotateForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const wordsStr = Array.isArray(config.words) ? (config.words as string[]).join('\n') : '';
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo (texto fijo antes de la palabra rotante)</label>
        <input type="text" value={(config.prefix as string) ?? ''} onChange={(e) => onChange('prefix', e.target.value)} placeholder="Ej: Comprá lo mejor en" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" maxLength={60} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Palabras rotantes <span className="text-gray-400">(una por línea, máx. 8)</span></label>
        <textarea
          value={wordsStr}
          onChange={(e) => { const lines = e.target.value.split('\n').slice(0, 8); onChange('words', lines.filter((l) => l.trim() !== '')); }}
          placeholder={'ropa\ncalzado\naccesorios'}
          rows={5}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>
    </div>
  );
}

function LampForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Título principal</label>
      <input type="text" value={(config.title as string) ?? ''} onChange={(e) => onChange('title', e.target.value)} placeholder="Ej: Nueva colección 2026" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" maxLength={100} />
    </div>
  );
}

function VideoForm({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const wordsStr = Array.isArray(config.words) ? (config.words as string[]).join('\n') : '';
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL del video <span className="text-gray-400">(opcional — si no hay, se usa el banner)</span></label>
        <input type="url" value={(config.videoUrl as string) ?? ''} onChange={(e) => onChange('videoUrl', e.target.value)} placeholder="https://videos.example.com/mi-tienda.mp4" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" maxLength={500} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo del título</label>
        <input type="text" value={(config.titlePrefix as string) ?? ''} onChange={(e) => onChange('titlePrefix', e.target.value)} placeholder="Ej: Bienvenido a" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" maxLength={60} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Palabras rotantes <span className="text-gray-400">(una por línea, máx. 8)</span></label>
        <textarea
          value={wordsStr}
          onChange={(e) => { const lines = e.target.value.split('\n').slice(0, 8); onChange('words', lines.filter((l) => l.trim() !== '')); }}
          placeholder={'ModaStyle\nlo mejor en moda'}
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
        <textarea value={(config.description as string) ?? ''} onChange={(e) => onChange('description', e.target.value)} placeholder="Una breve frase que describe tu tienda..." rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" maxLength={200} />
      </div>
    </div>
  );
}

export default function HeroPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HeroTemplate>('classic');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shopApi
      .getMyShop()
      .then((s) => {
        if (s) {
          setShop(s);
          setSelected((s.heroTemplate ?? 'classic') as HeroTemplate);
          setConfig((s.heroConfig as Record<string, unknown> | null) ?? {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleFieldChange(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await shopApi.updateHeroTemplate(selected, config);
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

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/my-shop" className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-bold text-xl text-gray-900">Hero / Portada</h1>
          <p className="text-sm text-gray-500">Elegí el estilo visual de la portada de tu tienda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {HERO_META.map((hero) => (
          <button
            key={hero.id}
            type="button"
            onClick={() => { setSelected(hero.id); setSaved(false); }}
            className={`text-left rounded-xl border-2 p-4 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              selected === hero.id ? 'border-teal-500 bg-teal-50/60 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="mb-3">{hero.preview}</div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">{hero.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{hero.description}</p>
                <p className="text-xs text-teal-600 mt-1 font-medium">{hero.fields}</p>
              </div>
              {selected === hero.id && (
                <div className="shrink-0 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center mt-0.5">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected !== 'classic' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-base text-gray-900">
            Configurar: {HERO_META.find((h) => h.id === selected)?.label}
          </h2>
          {selected === 'geometric' && <GeometricForm config={config} onChange={handleFieldChange} />}
          {selected === 'text-rotate' && <TextRotateForm config={config} onChange={handleFieldChange} />}
          {selected === 'lamp' && <LampForm config={config} onChange={handleFieldChange} />}
          {selected === 'video' && <VideoForm config={config} onChange={handleFieldChange} />}
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
          {saving ? 'Guardando...' : 'Guardar portada'}
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
