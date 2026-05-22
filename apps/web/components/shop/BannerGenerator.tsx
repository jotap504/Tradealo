'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { shop as shopApi } from '@/lib/api';

interface BannerStyle {
  id: string;
  label: string;
  render: (ctx: CanvasRenderingContext2D, w: number, h: number, shopName: string, tagline: string) => void;
}

const BANNER_STYLES: BannerStyle[] = [
  {
    id: 'oceano',
    label: 'Oceano',
    render(ctx, w, h, shopName, tagline) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#0ea5e9');
      grad.addColorStop(1, '#6366f1');
      renderBanner(ctx, w, h, grad, shopName, tagline);
    },
  },
  {
    id: 'atardecer',
    label: 'Atardecer',
    render(ctx, w, h, shopName, tagline) {
      const grad = ctx.createLinearGradient(0, h, w, 0);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(1, '#ec4899');
      renderBanner(ctx, w, h, grad, shopName, tagline);
    },
  },
  {
    id: 'bosque',
    label: 'Bosque',
    render(ctx, w, h, shopName, tagline) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(1, '#0d9488');
      renderBanner(ctx, w, h, grad, shopName, tagline);
    },
  },
  {
    id: 'noche',
    label: 'Noche',
    render(ctx, w, h, shopName, tagline) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#312e81');
      renderBanner(ctx, w, h, grad, shopName, tagline);
      // Star noise overlay
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 1.5 + 0.3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: 'fuego',
    label: 'Fuego',
    render(ctx, w, h, shopName, tagline) {
      const grad = ctx.createLinearGradient(0, h, w, 0);
      grad.addColorStop(0, '#dc2626');
      grad.addColorStop(1, '#f97316');
      renderBanner(ctx, w, h, grad, shopName, tagline);
    },
  },
  {
    id: 'lavanda',
    label: 'Lavanda',
    render(ctx, w, h, shopName, tagline) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#8b5cf6');
      grad.addColorStop(1, '#d946ef');
      renderBanner(ctx, w, h, grad, shopName, tagline);
    },
  },
];

function renderBanner(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  grad: CanvasGradient,
  shopName: string,
  tagline: string,
) {
  // Background gradient
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Radial depth overlay in top-right
  const radial = ctx.createRadialGradient(w * 0.85, h * 0.2, 0, w * 0.85, h * 0.2, w * 0.5);
  radial.addColorStop(0, 'rgba(255,255,255,0.18)');
  radial.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, w, h);

  // Shop name — centered, proportional font size
  ctx.font = `bold ${Math.round(h * 0.36)}px Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 12;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shopName || 'Mi Tienda', w / 2, h * 0.42);

  // Tagline
  ctx.font = `${Math.round(h * 0.16)}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 6;
  ctx.fillText(tagline || '', w / 2, h * 0.68);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

function drawPreview(
  canvas: HTMLCanvasElement,
  style: BannerStyle,
  w: number,
  h: number,
  shopName: string,
  tagline: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = w;
  canvas.height = h;
  style.render(ctx, w, h, shopName, tagline);
}

const BANNER_W = 1200;
const BANNER_H = 400;
const THUMB_W = 100;
const THUMB_H = 35;
const PREVIEW_W = 600;
const PREVIEW_H = 200;

interface BannerGeneratorProps {
  shopName: string;
  tagline: string;
  onSuccess: (url: string) => void;
}

export default function BannerGenerator({ shopName, tagline, onSuccess }: BannerGeneratorProps) {
  const [selectedId, setSelectedId] = useState(BANNER_STYLES[0].id);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const previewRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedStyle = BANNER_STYLES.find((s) => s.id === selectedId) ?? BANNER_STYLES[0];

  // Draw all thumbnails on mount and when shopName/tagline change
  useEffect(() => {
    BANNER_STYLES.forEach((style, i) => {
      const canvas = thumbRefs.current[i];
      if (canvas) drawPreview(canvas, style, THUMB_W, THUMB_H, shopName, tagline);
    });
  }, [shopName, tagline]);

  // Draw main preview when selection or inputs change
  useEffect(() => {
    if (previewRef.current) {
      drawPreview(previewRef.current, selectedStyle, PREVIEW_W, PREVIEW_H, shopName, tagline);
    }
  }, [selectedId, shopName, tagline, selectedStyle]);

  const handleUseBanner = useCallback(async () => {
    setUploading(true);
    setError('');
    setSuccessMsg('');
    try {
      // Draw at full resolution on an offscreen canvas
      const offscreen = fullCanvasRef.current ?? document.createElement('canvas');
      if (!fullCanvasRef.current) fullCanvasRef.current = offscreen;
      drawPreview(offscreen, selectedStyle, BANNER_W, BANNER_H, shopName, tagline);

      const dataUrl = offscreen.toDataURL('image/jpeg', 0.9);
      const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

      const result = await shopApi.uploadBanner(base64, 'image/jpeg');
      setSuccessMsg('¡Banner actualizado!');
      onSuccess(result.bannerUrl);
    } catch {
      setError('No se pudo guardar el banner. Intentá de nuevo.');
    } finally {
      setUploading(false);
    }
  }, [selectedStyle, shopName, tagline, onSuccess]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Generar banner automático</h3>

      {/* Style thumbnails */}
      <div className="flex gap-2 flex-wrap">
        {BANNER_STYLES.map((style, i) => (
          <button
            key={style.id}
            type="button"
            onClick={() => {
              setSelectedId(style.id);
              setSuccessMsg('');
            }}
            className="flex flex-col items-center gap-1 p-0.5 rounded-lg transition-all"
            style={{
              border: `2px solid ${selectedId === style.id ? '#14b8a6' : '#e5e7eb'}`,
              backgroundColor: selectedId === style.id ? '#f0fdfa' : 'transparent',
            }}
            aria-label={style.label}
          >
            <canvas
              ref={(el) => { thumbRefs.current[i] = el; }}
              width={THUMB_W}
              height={THUMB_H}
              className="rounded"
              style={{ display: 'block' }}
            />
            <span className="text-xs text-gray-600 font-medium pb-0.5">{style.label}</span>
          </button>
        ))}
      </div>

      {/* Main preview */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <canvas
          ref={previewRef}
          width={PREVIEW_W}
          height={PREVIEW_H}
          className="w-full"
          style={{ display: 'block' }}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {successMsg && <p className="text-xs text-green-600 font-medium">{successMsg}</p>}

      <button
        type="button"
        onClick={handleUseBanner}
        disabled={uploading}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-50"
      >
        {uploading ? 'Subiendo…' : 'Usar este banner'}
      </button>
    </div>
  );
}
