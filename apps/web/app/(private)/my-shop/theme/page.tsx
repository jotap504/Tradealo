'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, RotateCcw, Check, ArrowLeft } from 'lucide-react';
import { shop as shopApi } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Shop } from '@/types';

const PRESET_COLORS = [
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Violeta', value: '#a855f7' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Ámbar', value: '#f59e0b' },
  { label: 'Índigo', value: '#6366f1' },
  { label: 'Slate', value: '#64748b' },
];

const THEME_DEFAULTS: Record<string, string> = {
  minimalista: '#14b8a6',
  oscuro: '#38bdf8',
  vibrante: '#f97316',
  clasico: '#78716c',
  boutique: '#a855f7',
};

export default function MyShopThemePage() {
  const router = useRouter();
  const [shopData, setShopData] = useState<Shop | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#14b8a6');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopApi.getMyShop().then((s) => {
      setShopData(s);
      if (s.primaryColor) setSelectedColor(s.primaryColor);
      else setSelectedColor(THEME_DEFAULTS[s.theme] ?? '#14b8a6');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await shopApi.updatePrimaryColor(selectedColor);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await shopApi.updatePrimaryColor(null);
      const defaultColor = THEME_DEFAULTS[shopData?.theme ?? 'minimalista'] ?? '#14b8a6';
      setSelectedColor(defaultColor);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-8 bg-gray-100 rounded w-1/3 animate-pulse mb-6" />
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Palette size={22} className="text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">Color primario</h1>
        </div>
      </div>

      <p className="text-gray-500 text-sm">
        Este color se aplica en botones, acentos y elementos de marca de tu tienda. El tema base sigue siendo el elegido.
      </p>

      <Card>
        <CardHeader>
          <span className="font-semibold text-gray-700">Vista previa</span>
        </CardHeader>
        <CardBody>
          <div
            className="rounded-xl p-6 flex items-center gap-4"
            style={{ background: `${selectedColor}18`, borderLeft: `4px solid ${selectedColor}` }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shadow"
              style={{ background: selectedColor }}
            >
              T
            </div>
            <div>
              <p className="font-semibold" style={{ color: selectedColor }}>
                {shopData?.shopName || 'Mi Tienda'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{shopData?.tagline || 'Tu tagline aquí'}</p>
            </div>
            <button
              className="ml-auto px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm transition hover:opacity-90"
              style={{ background: selectedColor }}
            >
              Ver productos
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="font-semibold text-gray-700">Colores preestablecidos</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-5 gap-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => setSelectedColor(c.value)}
                className="relative flex flex-col items-center gap-1 group"
              >
                <span
                  className="w-10 h-10 rounded-full border-2 transition-all shadow-sm flex items-center justify-center"
                  style={{
                    background: c.value,
                    borderColor: selectedColor === c.value ? 'white' : 'transparent',
                    outline: selectedColor === c.value ? `3px solid ${c.value}` : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  {selectedColor === c.value && (
                    <Check size={14} className="text-white drop-shadow" />
                  )}
                </span>
                <span className="text-[10px] text-gray-500 group-hover:text-gray-700">{c.label}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="font-semibold text-gray-700">Color personalizado</span>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-14 h-14 rounded-xl border border-gray-200 cursor-pointer p-1"
            />
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setSelectedColor(v);
                }}
                maxLength={7}
                className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="#14b8a6"
              />
              <span className="text-xs text-gray-400">Código HEX</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
        >
          {saved ? (
            <><Check size={16} className="mr-2" /> Guardado</>
          ) : saving ? (
            'Guardando...'
          ) : (
            'Guardar color'
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={handleReset}
          disabled={saving}
          title="Restaurar color del tema"
        >
          <RotateCcw size={16} />
        </Button>
      </div>
    </div>
  );
}
