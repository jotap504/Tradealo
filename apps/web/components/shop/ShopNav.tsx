import Link from 'next/link';
import Image from 'next/image';

interface ShopNavProps {
  shopName: string | null;
  logoUrl: string | null;
  username: string;
}

export default function ShopNav({ shopName, logoUrl, username }: ShopNavProps) {
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 shadow-sm"
      style={{ backgroundColor: 'var(--shop-surface)', borderBottom: '1px solid var(--shop-border)' }}
    >
      <div className="flex items-center gap-3">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt={shopName ?? 'Logo'}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        )}
        <span className="font-semibold text-sm" style={{ color: 'var(--shop-text)' }}>
          {shopName ?? username}
        </span>
      </div>
      <Link
        href={`/seller/${username}`}
        className="text-xs underline"
        style={{ color: 'var(--shop-text-muted)' }}
      >
        Ver en Trocalia →
      </Link>
    </nav>
  );
}
