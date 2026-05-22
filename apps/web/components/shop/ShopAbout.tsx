'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { PublicShop } from '@/types';

const SOCIAL_META: Record<string, { label: string; icon: string; getHref: (v: string) => string }> = {
  instagram: { label: 'Instagram', icon: '📷', getHref: (v) => (v.startsWith('http') ? v : `https://instagram.com/${v}`) },
  facebook: { label: 'Facebook', icon: '📘', getHref: (v) => (v.startsWith('http') ? v : `https://facebook.com/${v}`) },
  tiktok: { label: 'TikTok', icon: '🎵', getHref: (v) => (v.startsWith('http') ? v : `https://tiktok.com/@${v}`) },
  youtube: { label: 'YouTube', icon: '▶️', getHref: (v) => v },
  twitter: { label: 'X', icon: '𝕏', getHref: (v) => (v.startsWith('http') ? v : `https://x.com/${v}`) },
  website: { label: 'Sitio web', icon: '🌐', getHref: (v) => v },
};

function GalleryCarousel({ images }: { images: PublicShop['galleryImages'] }) {
  const [current, setCurrent] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length < 2) return;
    timer.current = setInterval(() => {
      setCurrent((c) => (c + 1) % images.length);
    }, 3500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '16/9' }}>
      {images.map((img, i) => (
        <div
          key={img.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={img.url}
            alt={img.caption ?? `Galería ${i + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 80vw"
          />
        </div>
      ))}

      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrent(i);
                if (timer.current) { clearInterval(timer.current); timer.current = null; }
              }}
              className="rounded-full transition-all"
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                backgroundColor: i === current ? '#ffffff' : 'rgba(255,255,255,0.5)',
              }}
              aria-label={`Imagen ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShopAbout({ shop }: { shop: PublicShop }) {
  const hasText = !!shop.about || !!shop.locationText;
  const hasGallery = (shop.galleryImages?.length ?? 0) > 0;
  const hasSocials = Object.values(shop.socialLinks ?? {}).some(Boolean);

  if (!hasText && !hasGallery) return null;

  const socials = shop.socialLinks ?? {};

  return (
    <section
      className="w-full py-10"
      style={{
        backgroundColor: 'var(--shop-bg)',
        borderTop: '1px solid var(--shop-border)',
        borderBottom: '1px solid var(--shop-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {hasText && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div
                className="rounded-full shrink-0"
                style={{ width: 4, height: 28, backgroundColor: 'var(--shop-primary)' }}
              />
              <h2 className="text-xl font-bold" style={{ color: 'var(--shop-text)' }}>
                Sobre nosotros
              </h2>
            </div>

            {shop.about && (
              <p className="text-sm leading-relaxed max-w-3xl" style={{ color: 'var(--shop-text-muted)' }}>
                {shop.about}
              </p>
            )}

            {shop.locationText && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--shop-text-muted)' }}>
                <span aria-hidden>📍</span>
                <span>{shop.locationText}</span>
              </div>
            )}

            {hasSocials && (
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(SOCIAL_META).map(([key, meta]) => {
                  const val = socials[key as keyof typeof socials];
                  if (!val) return null;
                  return (
                    <a
                      key={key}
                      href={meta.getHref(val)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80"
                      style={{
                        borderColor: 'var(--shop-border)',
                        color: 'var(--shop-text-muted)',
                        backgroundColor: 'var(--shop-surface)',
                      }}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {hasGallery && <GalleryCarousel images={shop.galleryImages} />}
      </div>
    </section>
  );
}
