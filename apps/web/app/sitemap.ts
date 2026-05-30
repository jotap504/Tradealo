import type { MetadataRoute } from 'next';
import { APP_URL, API_URL } from '@/lib/constants';

export const revalidate = 3600;

interface ListingRow {
  id: string;
  updatedAt?: string;
  publishedAt?: string;
}

interface CategoryNode {
  slug: string;
  children?: CategoryNode[];
}

async function fetchListingPage(cursor: string | null): Promise<{
  data: ListingRow[];
  nextCursor: string | null;
}> {
  const url = new URL(`${API_URL.replace(/\/$/, '')}/listings`);
  url.searchParams.set('limit', '50');
  if (cursor) url.searchParams.set('cursor', cursor);
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return { data: [], nextCursor: null };
  const body = (await res.json()) as {
    data?: { data?: ListingRow[]; nextCursor?: string | null };
    success?: boolean;
  };
  const payload =
    body.data ??
    (body as unknown as { data: ListingRow[]; nextCursor: string | null });
  return {
    data: payload.data ?? [],
    nextCursor: payload.nextCursor ?? null,
  };
}

async function fetchAllListings(maxPages = 40): Promise<ListingRow[]> {
  const all: ListingRow[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < maxPages; i++) {
    const { data, nextCursor } = await fetchListingPage(cursor);
    all.push(...data);
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  return all;
}

async function fetchCategoryTree(): Promise<CategoryNode[]> {
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}/categories/tree`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      data?: CategoryNode[];
      success?: boolean;
    };
    return body.data ?? (body as unknown as CategoryNode[]);
  } catch {
    return [];
  }
}

function flattenCategorySlugs(nodes: CategoryNode[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (n.slug) out.push(n.slug);
    if (n.children?.length) out.push(...flattenCategorySlugs(n.children));
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = APP_URL.replace(/\/$/, '');
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/listings`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const [listings, categoryTree] = await Promise.all([
    fetchAllListings().catch(() => [] as ListingRow[]),
    fetchCategoryTree(),
  ]);

  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${base}/listing/${l.id}`,
    lastModified: l.updatedAt
      ? new Date(l.updatedAt)
      : l.publishedAt
        ? new Date(l.publishedAt)
        : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const categorySlugs = flattenCategorySlugs(categoryTree);
  const categoryRoutes: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${base}/listings?category=${encodeURIComponent(slug)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [...staticRoutes, ...listingRoutes, ...categoryRoutes];
}
