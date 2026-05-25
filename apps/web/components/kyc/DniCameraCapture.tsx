'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';

interface Props {
  side: 'front' | 'back';
  onCapture: (base64: string, mimeType: 'image/jpeg') => void;
  onClose: () => void;
}

const GUIDE_RATIO = 85.6 / 54; // DNI standard aspect ratio (credit-card size)

export function DniCameraCapture({ side, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    roRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError('No se pudo acceder a la cámara. Verificá los permisos del navegador.');
    }
  }, []);

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) { rafRef.current = requestAnimationFrame(drawOverlay); return; }

    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    const padding = w * 0.06;
    const guideW = w - padding * 2;
    const guideH = guideW / GUIDE_RATIO;
    const guideX = padding;
    const guideY = (h - guideH) / 2;

    // dark vignette outside guide
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, w, h);
    ctx.clearRect(guideX, guideY, guideW, guideH);

    // corner brackets
    const corner = 24;
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [cx, cy, dx, dy] of [
      [guideX, guideY, 1, 1],
      [guideX + guideW, guideY, -1, 1],
      [guideX, guideY + guideH, 1, -1],
      [guideX + guideW, guideY + guideH, -1, -1],
    ] as [number, number, number, number][]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * corner, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * corner);
      ctx.stroke();
    }

    rafRef.current = requestAnimationFrame(drawOverlay);
  }, [ready]);

  // attach overlay canvas via callback ref so ResizeObserver keeps it synced
  const setCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    roRef.current?.disconnect();
    canvasRef.current = el;
    if (!el) return;
    el.width = el.offsetWidth;
    el.height = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      el.width = el.offsetWidth;
      el.height = el.offsetHeight;
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  useEffect(() => { startCamera(); return stopCamera; }, [startCamera, stopCamera]);

  useEffect(() => {
    if (ready) rafRef.current = requestAnimationFrame(drawOverlay);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, drawOverlay]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const snap = document.createElement('canvas');
    snap.width = video.videoWidth;
    snap.height = video.videoHeight;
    snap.getContext('2d')?.drawImage(video, 0, 0);
    snap.toBlob(
      (blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          stopCamera();
          onCapture(base64, 'image/jpeg');
        };
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      0.92,
    );
  };

  const sideLabel = side === 'front' ? 'frente' : 'dorso';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onCanPlay={() => setReady(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={setCanvasRef} className="absolute inset-0 w-full h-full" />

        {/* instruction */}
        <div className="absolute bottom-0 left-0 right-0 pb-5 flex flex-col items-center gap-1 pointer-events-none">
          <p className="text-white text-sm font-semibold drop-shadow-md">
            Colocá el <span className="text-teal-300">{sideLabel}</span> de tu DNI dentro del marco
          </p>
          <p className="text-white/60 text-xs drop-shadow">Buena luz, sin reflejos, bien enfocado</p>
        </div>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 px-8">
            <div className="bg-white rounded-2xl p-6 text-center space-y-4 w-full max-w-xs">
              <p className="text-sm text-gray-700">{error}</p>
              <button
                onClick={startCamera}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium"
              >
                <RotateCcw size={14} /> Reintentar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* controls bar */}
      <div className="bg-black py-5 px-8 flex items-center justify-between safe-area-inset-bottom">
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white active:bg-white/25"
        >
          <X size={20} />
        </button>

        {/* shutter button */}
        <button
          onClick={handleCapture}
          disabled={!ready}
          aria-label="Capturar foto"
          className="rounded-full bg-white flex items-center justify-center shadow-xl disabled:opacity-40 active:scale-95 transition-transform"
          style={{ width: 72, height: 72 }}
        >
          <Camera size={28} className="text-gray-800" />
        </button>

        <div className="w-12" />
      </div>
    </div>
  );
}
