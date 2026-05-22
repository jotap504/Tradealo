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

export default function ShopAbout({ shop }: { shop: PublicShop }) {
  const hasContent =
    !!shop.about || !!shop.locationText || (shop.galleryImages?.length ?? 0) > 0;

  if (!hasContent) return null;

  const socials = shop.socialLinks ?? {};
  const gallerySlice = (shop.galleryImages ?? []).slice(0, 4);

  // Fill remaining slots with null for placeholder rendering
  const gallerySlots: (typeof gallerySlice[number] | null)[] = [
    ...gallerySlice,
    ...Array(Math.max(0, 4 - gallerySlice.length)).fill(null),
  ];

  return (
    <section
      className="w-full py-10"
      style={{
        backgroundColor: 'var(--shop-bg)',
        borderTop: '1px solid var(--shop-border)',
        borderBottom: '1px solid var(--shop-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left — info */}
          <div className="flex flex-col gap-4">
            {/* Title with left accent bar */}
            <div className="flex items-center gap-3">
              <div
                className="rounded-full shrink-0"
                style={{ width: 4, height: 28, backgroundColor: 'var(--shop-primary)' }}
              />
              <h2
                className="text-xl font-bold"
                style={{ color: 'var(--shop-text)' }}
              >
                Sobre nosotros
              </h2>
            </div>

            {shop.about && (
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--shop-text-muted)' }}
              >
                {shop.about}
              </p>
            )}

            {shop.locationText && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--shop-text-muted)' }}>
                <span aria-hidden>📍</span>
                <span>{shop.locationText}</span>
              </div>
            )}

            {/* Social links */}
            {Object.keys(socials).length > 0 && (
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
                      aria-label={meta.label}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right — gallery 2x2 grid */}
          {(shop.galleryImages?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {gallerySlots.map((img, i) =>
                img ? (
                  <div
                    key={img.id}
                    className="relative rounded-xl overflow-hidden"
                    style={{ aspectRatio: '1/1' }}
                  >
                    <Image
                      src={img.url}
                      alt={img.caption ?? `Galería ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                ) : (
                  <div
                    key={`placeholder-${i}`}
                    className="rounded-xl"
                    style={{
                      aspectRatio: '1/1',
                      background: 'linear-gradient(135deg, var(--shop-primary) 0%, var(--shop-border) 100%)',
                      opacity: 0.25,
                    }}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
