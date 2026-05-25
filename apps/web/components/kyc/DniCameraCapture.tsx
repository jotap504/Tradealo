'use client';

import { useEffect, useRef, useState, useCallback, ChangeEvent } from 'react';
import { Camera, X, RotateCcw, ImageIcon } from 'lucide-react';

interface Props {
  side: 'front' | 'back';
  onCapture: (base64: string, mimeType: 'image/jpeg') => void;
  onClose: () => void;
}

const GUIDE_RATIO = 85.6 / 54; // DNI standard aspect ratio

type ErrorKind = 'permission' | 'https' | 'unsupported' | 'notfound' | 'other';

const ERROR_MSG: Record<ErrorKind, string> = {
  permission: 'Permiso de cámara denegado. Habilitá el acceso en Configuración → Navegador → Cámara.',
  https: 'La cámara en vivo requiere conexión segura (HTTPS). Podés subir una foto con el botón de abajo.',
  unsupported: 'Tu navegador no soporta cámara en vivo. Podés subir una foto con el botón de abajo.',
  notfound: 'No se encontró una cámara disponible. Podés subir una foto con el botón de abajo.',
  other: 'No se pudo iniciar la cámara. Podés subir una foto con el botón de abajo.',
};

export function DniCameraCapture({ side, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    roRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setErrorKind(null);
    setReady(false);

    // Detect if the API exists (absent on HTTP contexts in mobile browsers)
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorKind(window.isSecureContext === false ? 'https' : 'unsupported');
      return;
    }

    // Try rear camera first, then any camera as fallback
    const constraintSets = [
      { video: { facingMode: 'environment' }, audio: false },
      { video: true, audio: false },
    ];

    for (const constraints of constraintSets) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        return;
      } catch (err) {
        const name = (err as DOMException).name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorKind('permission');
          return; // retrying with different constraints won't help
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorKind('notfound');
          return;
        }
        // OverconstrainedError or other → try next set of constraints
      }
    }

    setErrorKind('other');
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
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
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

  // capture from live video stream
  const handleShutter = () => {
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

  // fallback: read from file input and convert to JPEG via canvas
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const snap = document.createElement('canvas');
      snap.width = img.naturalWidth;
      snap.height = img.naturalHeight;
      snap.getContext('2d')?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      snap.toBlob(
        (blob) => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            onCapture(base64, 'image/jpeg');
          };
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.92,
      );
    };
    img.src = url;
  };

  const sideLabel = side === 'front' ? 'frente' : 'dorso';
  const canShowFallback = errorKind && errorKind !== 'permission';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* hidden fallback input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

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

        {/* instruction overlay */}
        {!errorKind && (
          <div className="absolute bottom-0 left-0 right-0 pb-5 flex flex-col items-center gap-1 pointer-events-none">
            <p className="text-white text-sm font-semibold drop-shadow-md">
              Colocá el <span className="text-teal-300">{sideLabel}</span> de tu DNI dentro del marco
            </p>
            <p className="text-white/60 text-xs drop-shadow">Buena luz · sin reflejos · bien enfocado</p>
          </div>
        )}

        {/* error overlay */}
        {errorKind && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-8">
            <div className="bg-white rounded-2xl p-6 text-center space-y-4 w-full max-w-xs">
              <p className="text-sm text-gray-700 leading-relaxed">{ERROR_MSG[errorKind]}</p>
              <div className="flex flex-col gap-2">
                {errorKind === 'permission' && (
                  <button
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium"
                  >
                    <RotateCcw size={14} /> Reintentar
                  </button>
                )}
                {canShowFallback && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium"
                  >
                    <ImageIcon size={14} /> Seleccionar foto
                  </button>
                )}
                <button
                  onClick={() => { stopCamera(); onClose(); }}
                  className="w-full px-4 py-2 text-gray-500 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* controls bar — only visible when camera is running */}
      {!errorKind && (
        <div className="bg-black py-5 px-8 flex items-center justify-between">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white active:bg-white/25"
          >
            <X size={20} />
          </button>

          <button
            onClick={handleShutter}
            disabled={!ready}
            aria-label="Capturar foto"
            className="rounded-full bg-white flex items-center justify-center shadow-xl disabled:opacity-40 active:scale-95 transition-transform"
            style={{ width: 72, height: 72 }}
          >
            <Camera size={28} className="text-gray-800" />
          </button>

          <div className="w-12" />
        </div>
      )}
    </div>
  );
}
