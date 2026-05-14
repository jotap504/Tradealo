import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingGrid } from '@/components/listing/ListingGrid';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { DarkHero } from '@/components/listing/DarkHero';
import { API_URL } from '@/lib/constants';
import type { Listing, Category } from '@/types';

async function fetchListings(params: string): Promise<Listing[]> {
  try {
    const res = await fetch(`${API_URL}/listings?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    // API wraps: { success: true, data: { data: Listing[], total: number } }
    const arr = json?.data?.data ?? json?.data;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    // API wraps: { success: true, data: Category[] }
    const arr = json?.data ?? json;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const SLUG_EMOJI: Array<[string, string]> = [
  ['moda', '👕'],
  ['ropa', '👕'],
  ['tecnolog', '📱'],
  ['celular', '📱'],
  ['libro', '📚'],
  ['cultur', '📚'],
  ['hogar', '🛋️'],
  ['mueble', '🛋️'],
  ['depor', '🚲'],
  ['bici', '🚲'],
  ['coleccion', '💎'],
  ['joya', '💎'],
  ['herram', '🔧'],
  ['construc', '🔧'],
  ['niño', '🧸'],
  ['bebé', '🧸'],
  ['infant', '🧸'],
  ['music', '🎸'],
  ['instrumen', '🎸'],
];

function getCategoryEmoji(slug: string): string {
  const s = slug?.toLowerCase() ?? '';
  const match = SLUG_EMOJI.find(([key]) => s.includes(key));
  return match ? match[1] : '📦';
}

export default async function HomePage() {
  const [
    premiumListings,
    recentListings,
    collectibleListings,
    endingSoonAuctions,
    categories,
  ] = await Promise.all([
    fetchListings('type=premium&limit=6'),
    fetchListings('limit=12&sort=recent'),
    fetchListings('isCollectible=true&limit=6'),
    fetchListings('saleType=auction&endingSoon=24&limit=6&sort=recent'),
    fetchCategories(),
  ]);

  const rootCategories = categories.filter((c) => !c.parentId).slice(0, 12);

  return (
    <div className="flex flex-col gap-16 pb-20">
      <DarkHero />

      {/* Categorías */}
      {rootCategories.length > 0 && (
        <section className="px-4 mx-auto w-full max-w-7xl">
          <h2 className="font-heading text-2xl font-bold text-tradealo-text mb-6">
            Explorar por categoría
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {rootCategories.map((cat) => (
              <Link key={cat.id} href={`/listings?category=${cat.id}`}>
                <Card hover className="text-center cursor-pointer">
                  <CardBody className="flex flex-col items-center gap-3 py-6">
                    <span className="text-3xl" role="img" aria-label={cat.name}>
                      {getCategoryEmoji(cat.slug)}
                    </span>
                    <span className="font-medium text-sm text-tradealo-text">
                      {cat.name}
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Premium */}
      {premiumListings.length > 0 && (
        <section className="px-4 mx-auto w-full max-w-7xl">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-heading text-2xl font-bold text-tradealo-text">
              Publicaciones Destacadas
            </h2>
            <Badge variant="premium">Premium</Badge>
          </div>
          <div className="overflow-x-auto pb-3 -mx-4 px-4">
            <div className="flex gap-4 snap-x snap-mandatory" style={{ width: 'max-content' }}>
              {premiumListings.map((listing) => (
                <div key={listing.id} className="w-64 shrink-0 snap-start">
                  <ListingCard listing={listing} variant="grid" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Remates próximos a finalizar */}
      {endingSoonAuctions.length > 0 && (
        <section className="px-4 mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold text-tradealo-text">
              Remates Próximos a Finalizar
            </h2>
            <Link
              href="/listings?saleType=auction&endingSoon=24"
              className="text-sm text-tradealo-primary hover:underline font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {endingSoonAuctions.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="grid" />
            ))}
          </div>
        </section>
      )}

      {/* Recientes */}
      <section className="px-4 mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-2xl font-bold text-tradealo-text">
            Publicaciones recientes
          </h2>
          <Link
            href="/listings"
            className="text-sm text-tradealo-primary hover:underline font-medium flex items-center gap-1"
          >
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>
        <ListingGrid listings={recentListings} cols={4} />
      </section>

      {/* Coleccionables */}
      {collectibleListings.length > 0 && (
        <section className="px-4 mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold text-tradealo-text">
              Coleccionables
            </h2>
            <Link
              href="/listings?isCollectible=true"
              className="text-sm text-tradealo-primary hover:underline font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {collectibleListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="grid" />
            ))}
          </div>
        </section>
      )}

      {/* CTA registro */}
      <section className="px-4 mx-auto w-full max-w-7xl">
        <div className="bg-gradient-to-r from-tradealo-primary to-tradealo-primary-hover rounded-2xl p-8 sm:p-12 text-center text-white">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-3">
            ¡Publicá gratis!
          </h2>
          <p className="text-white/80 mb-6 text-base max-w-md mx-auto">
            Sumate a miles de argentinos que intercambian, compran y venden en Tradealo.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="bg-white text-tradealo-primary font-semibold px-8 py-3 rounded-xl hover:bg-tradealo-primary-light transition-colors"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/listings"
              className="border border-white/40 text-white font-medium px-8 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Explorar publicaciones
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
