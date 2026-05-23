'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import type { ShopGalleryImage } from '@/types';

interface LightboxState {
  index: number;
  direction: number;
}

const variants = {
  enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d < 0 ? 300 : -300, opacity: 0 }),
};

export default function ShopGallery({ images }: { images: ShopGalleryImage[] }) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const open = (index: number) => setLightbox({ index, direction: 0 });
  const close = () => setLightbox(null);

  const navigate = useCallback((step: number) => {
    setLightbox((prev) => {
      if (!prev) return null;
      const next = (prev.index + step + images.length) % images.length;
      return { index: next, direction: step };
    });
  }, [images.length]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, navigate]);

  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  if (!images.length) return null;

  const current = lightbox !== null ? images[lightbox.index] : null;

  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--shop-text)' }}>
        Galería
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((img, idx) => (
          <motion.button
            key={img.id}
            onClick={() => open(idx)}
            className="relative aspect-square overflow-hidden rounded-xl focus:outline-none group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <Image
              src={img.url}
              alt={img.caption ?? `Foto ${idx + 1}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
              <ZoomIn
                size={22}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow"
              />
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox && current && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
            onClick={close}
          >
            <div
              className="relative w-full max-w-4xl flex flex-col items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={close}
                className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <X size={26} />
              </button>

              {/* Counter */}
              <p className="absolute -top-10 left-0 text-white/50 text-sm">
                {lightbox.index + 1} / {images.length}
              </p>

              {/* Image */}
              <div className="relative w-full overflow-hidden rounded-2xl" style={{ maxHeight: '70vh' }}>
                <AnimatePresence custom={lightbox.direction} mode="wait">
                  <motion.div
                    key={lightbox.index}
                    custom={lightbox.direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                    className="w-full"
                  >
                    <Image
                      src={current.url}
                      alt={current.caption ?? `Foto ${lightbox.index + 1}`}
                      width={1200}
                      height={800}
                      className="w-full object-contain rounded-2xl"
                      style={{ maxHeight: '70vh' }}
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Caption */}
              {current.caption && (
                <motion.p
                  key={`caption-${lightbox.index}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white/80 text-sm text-center px-4"
                >
                  {current.caption}
                </motion.p>
              )}

              {/* Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => navigate(-1)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
                    aria-label="Anterior"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <button
                    onClick={() => navigate(1)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
                    aria-label="Siguiente"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 max-w-full">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setLightbox({ index: idx, direction: idx > lightbox.index ? 1 : -1 })}
                      className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all"
                      style={{
                        outline: idx === lightbox.index ? '2px solid var(--shop-primary, #14b8a6)' : '2px solid transparent',
                        outlineOffset: '2px',
                        opacity: idx === lightbox.index ? 1 : 0.5,
                      }}
                    >
                      <Image
                        src={img.url}
                        alt={`Miniatura ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
