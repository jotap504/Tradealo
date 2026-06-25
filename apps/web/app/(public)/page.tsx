import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight } from 'lucide-react';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingGrid } from '@/components/listing/ListingGrid';
import { Badge } from '@/components/ui/Badge';
import { CategoryAccordionHero } from '@/components/ui/interactive-image-accordion';
import { PromoBannerSlider } from '@/components/ui/PromoBannerSlider';
import { API_URL } from '@/lib/constants';

const LiveVideosSection = dynamic(
  () => import('@/components/listing/LiveVideosSection').then((m) => m.LiveVideosSection),
  { ssr: false },
);
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

const CATEGORY_IMAGES: Array<[string, string]> = [
  ['electronica', '/categories/electronics_v2.png'],
  ['vehiculos', '/categories/vehicles_v2.png'],
  ['calzado', '/categories/footwear_v2.png'],
  ['ropa', '/categories/fashion_v2.png'],
  ['hogar', '/categories/home_v2.png'],
  ['deportes', '/categories/sports_v2.png'],
  ['instrumentos', '/categories/music_v2.png'],
  ['coleccionables', '/categories/collectibles_v2.png'],
  ['mascota', '/categories/pets_v2.png'],
  ['servicio', '/categories/services_v2.png'],
  ['salud', '/categories/health_v2.png'],
  ['juguete', '/categories/toys_v2.png'],
  ['bebe', '/categories/babies_v2.png'],
  ['bebé', '/categories/babies_v2.png'],
  ['otros', '/categories/others_v2.png'],
  ['tecnolog', '/categories/electronics_v2.png'],
  ['celular', '/categories/electronics_v2.png'],
  ['mueble', '/categories/home_v2.png'],
  ['bici', '/categories/sports_v2.png'],
  ['niño', '/categories/kids_v2.png'],
  ['herram', '/categories/tools_v2.png'],
  ['libro', '/categories/books_v2.png'],
];

function getCategoryImage(slug: string): string {
  const s = slug?.toLowerCase() ?? '';
  const match = CATEGORY_IMAGES.find(([key]) => s.includes(key));
  return match ? match[1] : '/categories/fashion.png'; // fallback
}

export default async function HomePage() {
  const [
    premiumListings,
    recentListings,
    collectibleListings,
    endingSoonAuctions,
    liveListings,
    categories,
  ] = await Promise.all([
    fetchListings('type=premium&limit=6'),
    fetchListings('limit=12&sort=recent&excludeYoutubeLive=true'),
    fetchListings('isCollectible=true&limit=6'),
    fetchListings('saleType=auction&endingSoon=24&limit=6&sort=recent'),
    fetchListings('hasYoutubeLive=true&limit=10'),
    fetchCategories(),
  ]);

  const rootCategories = categories.filter((c) => !c.parentId).slice(0, 12);

  return (
    <div className="flex flex-col gap-10 pb-20">
      <CategoryAccordionHero />

      {/* Banners promocionales */}
      <PromoBannerSlider />

      <LiveVideosSection listings={liveListings} />

      {/* Categorías */}
      {rootCategories.length > 0 && (
        <section className="px-4 mx-auto w-full max-w-7xl">
          <h2 className="font-heading text-2xl font-bold text-tradealo-text mb-6">
            Explorar por categoría
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {rootCategories.map((cat) => (
              <Link key={cat.id} href={`/listings?category=${cat.id}`} className="group">
                <div className="flex flex-col gap-3">
                  <div className="aspect-square bg-white rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center p-4 transition-all duration-300 group-hover:border-gray-200 group-hover:shadow-md">
                    <img
                      src={getCategoryImage(cat.slug)}
                      alt={cat.name}
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 filter brightness-[1.02] contrast-[1.05]"
                    />
                  </div>
                  <span className="font-semibold text-sm text-tradealo-text text-center line-clamp-1">
                    {cat.name}
                  </span>
                </div>
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
            ¡Publicar!
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
