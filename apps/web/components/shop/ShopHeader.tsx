import Image from 'next/image';
import type { PublicShop } from '@/types';

const SOCIAL_ICONS: Record<string, { label: string; baseUrl: string; icon: string }> = {
  instagram: { label: 'Instagram', baseUrl: 'https://instagram.com/', icon: '📷' },
  facebook: { label: 'Facebook', baseUrl: 'https://facebook.com/', icon: '📘' },
  tiktok: { label: 'TikTok', baseUrl: 'https://tiktok.com/@', icon: '🎵' },
  youtube: { label: 'YouTube', baseUrl: '', icon: '▶️' },
  twitter: { label: 'X/Twitter', baseUrl: 'https://x.com/', icon: '🐦' },
  website: { label: 'Web', baseUrl: '', icon: '🌐' },
};

export default function ShopHeader({ shop }: { shop: PublicShop }) {
  const waNumber = (shop.whatsappBusiness ?? '').replace(/\D/g, '');
  const socials = shop.socialLinks ?? {};

  return (
    <div>
      {shop.bannerUrl && (
        <div className="relative h-48 md:h-64 w-full overflow-hidden">
          <Image src={shop.bannerUrl} alt="Banner" fill className="object-cover" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-end gap-4 -mt-12 md:-mt-16">
          {shop.logoUrl ? (
            <Image
              src={shop.logoUrl}
              alt={shop.shopName ?? 'Logo'}
              width={96}
              height={96}
              className="rounded-2xl border-4 object-cover shadow-md"
              style={{ borderColor: 'var(--shop-surface)' }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-2xl border-4 flex items-center justify-center text-3xl font-bold shadow-md"
              style={{ backgroundColor: 'var(--shop-primary)', borderColor: 'var(--shop-surface)', color: '#fff' }}
            >
              {(shop.shopName ?? shop.username ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-2xl font-bold truncate" style={{ color: 'var(--shop-text)' }}>
              {shop.shopName ?? shop.username}
            </h1>
            {shop.tagline && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--shop-text-muted)' }}>
                {shop.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: '#25d366' }}
            >
              💬 WhatsApp
            </a>
          )}

          {Object.entries(SOCIAL_ICONS).map(([key, meta]) => {
            const val = socials[key as keyof typeof socials];
            if (!val) return null;
            const href = val.startsWith('http') ? val : `${meta.baseUrl}${val}`;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full border"
                style={{ borderColor: 'var(--shop-border)', color: 'var(--shop-text-muted)' }}
                aria-label={meta.label}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </a>
            );
          })}
        </div>

        {shop.about && (
          <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--shop-text-muted)' }}>
            {shop.about}
          </p>
        )}

        {shop.locationText && (
          <p className="mt-2 text-xs" style={{ color: 'var(--shop-text-muted)' }}>
            📍 {shop.locationText}
          </p>
        )}
      </div>
    </div>
  );
}
