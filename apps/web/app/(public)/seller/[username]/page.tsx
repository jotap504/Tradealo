import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, MapPin, Calendar, Store } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ReputationStars } from '@/components/ui/ReputationStars';
import { ListingGrid } from '@/components/listing/ListingGrid';
import { API_URL } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { User, Listing, PaginatedResponse } from '@/types';
import { ReportButton } from '@/components/listing/ReportButton';

async function getProfile(username: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/users/by-username/${username}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json = await res.json();
    // API wraps: { success: true, data: User }
    return json?.data ?? json;
  } catch {
    return null;
  }
}

async function getSellerListings(userId: string): Promise<Listing[]> {
  try {
    const res = await fetch(
      `${API_URL}/listings?sellerId=${userId}&limit=12`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data: PaginatedResponse<Listing> = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  return {
    title: `Perfil de @${params.username} | Tradealo`,
    description: `Mirá las publicaciones y reputación de @${params.username} en Tradealo.`,
  };
}

export default async function SellerProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const user = await getProfile(params.username);
  if (!user) notFound();

  const sellerListings = await getSellerListings(user.id);
  const rep = user.reputation ?? { average: 0, count: 0 };

  const kycLabel =
    user.kycLevel === 0
      ? null
      : user.kycLevel === 1
      ? 'Identidad verificada'
      : 'Verificación completa';

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-8">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-tradealo-border p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Avatar
            src={user.avatarUrl}
            username={user.username ?? user.email}
            size="xl"
          />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-2xl font-bold text-tradealo-text">
                @{user.username ?? user.email}
              </h1>
              {user.kycLevel >= 1 && (
                <ShieldCheck size={20} className="text-tradealo-primary" />
              )}
            </div>

            {kycLabel && (
              <Badge variant="primary" size="sm">
                {kycLabel}
              </Badge>
            )}

            <ReputationStars rating={rep.average} count={rep.count} />

            <div className="flex flex-col gap-1.5 text-sm text-tradealo-text-muted">
              {user.province && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>
                    {user.city ? `${user.city}, ` : ''}
                    {user.province}
                  </span>
                </div>
              )}
              {user.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Miembro desde {formatDate(user.createdAt)}</span>
                </div>
              )}
            </div>

            {user.bio && (
              <p className="text-sm text-tradealo-text leading-relaxed max-w-prose">
                {user.bio}
              </p>
            )}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              {user.shopSlug && (
                <Link
                  href={`/shop/${user.shopSlug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-tradealo-primary, #0d9488)' }}
                >
                  <Store size={15} />
                  Ver Tienda
                </Link>
              )}
              <ReportButton targetType="user" targetId={user.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <section>
        <h2 className="font-heading text-xl font-bold text-tradealo-text mb-5">
          Publicaciones activas
        </h2>
        <ListingGrid
          listings={sellerListings}
          cols={3}
          emptyTitle="Sin publicaciones"
          emptyMessage="Este vendedor no tiene publicaciones activas en este momento."
        />
      </section>
    </div>
  );
}
