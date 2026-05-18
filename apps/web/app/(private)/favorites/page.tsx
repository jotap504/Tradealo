'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { favorites } from '@/lib/api';
import { ListingCard } from '@/components/listing/ListingCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

export default function FavoritesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['favorites', 'list'],
    queryFn: () => favorites.list(),
    staleTime: 30_000,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-tradealo-text">
          Mis favoritos
        </h1>
        <p className="text-sm text-tradealo-text-muted mt-1">
          Publicaciones que guardaste para mirar después.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-64" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-tradealo-border p-10 text-center">
          <Heart size={36} className="mx-auto text-tradealo-text-muted mb-3" />
          <h2 className="font-heading font-semibold text-lg">
            Todavía no tenés favoritos
          </h2>
          <p className="text-sm text-tradealo-text-muted mt-1 mb-4">
            Tocá el corazón en cualquier publicación para guardarla acá.
          </p>
          <Link href="/listings">
            <Button>Explorar publicaciones</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
