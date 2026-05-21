'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { ShopGalleryImage } from '@/types';

export default function ShopGallery({ images }: { images: ShopGalleryImage[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!images.length) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--shop-text)' }}>
        Galería
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => setLightbox(img.url)}
            className="relative aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--shop-primary)' } as React.CSSProperties}
          >
            <Image src={img.url} alt={img.caption ?? 'Foto'} fill className="object-cover hover:scale-105 transition-transform duration-200" />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox}
              alt="Foto ampliada"
              width={900}
              height={600}
              className="rounded-xl object-contain w-full h-auto"
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 text-white text-xl bg-black/40 rounded-full w-8 h-8 flex items-center justify-center"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
