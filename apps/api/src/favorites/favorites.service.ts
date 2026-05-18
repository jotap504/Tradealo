import { Injectable, Inject } from '@nestjs/common'
import { eq, and, inArray, desc, asc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { DRIZZLE_TOKEN } from '../database/database.module'
import * as schema from '../database/schema'

type DB = NodePgDatabase<typeof schema>
type Listing = typeof schema.listings.$inferSelect
type ListingImage = typeof schema.listingImages.$inferSelect

interface SellerInfo {
  id: string
  email: string
  role: string
  kycLevel: number
  username: string | null
  avatarUrl: string | null
  bio: string | null
  city: string | null
  province: string | null
}

export interface FavoriteListing extends Listing {
  favoritedAt: Date
  images: ListingImage[]
  seller: SellerInfo | undefined
}

@Injectable()
export class FavoritesService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async add(userId: string, listingId: string) {
    await this.db
      .insert(schema.favoriteListings)
      .values({ userId, listingId })
      .onConflictDoNothing()
    return { ok: true as const }
  }

  async remove(userId: string, listingId: string) {
    await this.db
      .delete(schema.favoriteListings)
      .where(
        and(
          eq(schema.favoriteListings.userId, userId),
          eq(schema.favoriteListings.listingId, listingId),
        ),
      )
    return { ok: true as const }
  }

  async listIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ listingId: schema.favoriteListings.listingId })
      .from(schema.favoriteListings)
      .where(eq(schema.favoriteListings.userId, userId))
    return rows.map((r) => r.listingId)
  }

  async list(userId: string): Promise<FavoriteListing[]> {
    const rows = await this.db
      .select({
        favoritedAt: schema.favoriteListings.createdAt,
        listing: schema.listings,
      })
      .from(schema.favoriteListings)
      .innerJoin(
        schema.listings,
        eq(schema.favoriteListings.listingId, schema.listings.id),
      )
      .where(eq(schema.favoriteListings.userId, userId))
      .orderBy(desc(schema.favoriteListings.createdAt))

    if (rows.length === 0) return []

    const listingIds = rows.map((r) => r.listing.id)
    const sellerIds = Array.from(new Set(rows.map((r) => r.listing.userId)))

    const [allImages, sellers] = await Promise.all([
      this.db
        .select()
        .from(schema.listingImages)
        .where(inArray(schema.listingImages.listingId, listingIds))
        .orderBy(asc(schema.listingImages.sortOrder)),
      this.db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          role: schema.users.role,
          kycLevel: schema.users.kycLevel,
          username: schema.userProfiles.username,
          avatarUrl: schema.userProfiles.avatarUrl,
          bio: schema.userProfiles.bio,
          city: schema.userProfiles.city,
          province: schema.userProfiles.province,
        })
        .from(schema.users)
        .leftJoin(
          schema.userProfiles,
          eq(schema.userProfiles.userId, schema.users.id),
        )
        .where(inArray(schema.users.id, sellerIds)),
    ])

    const imageMap = new Map<string, ListingImage[]>()
    for (const img of allImages) {
      const arr = imageMap.get(img.listingId) ?? []
      arr.push(img)
      imageMap.set(img.listingId, arr)
    }

    const sellersById = new Map<string, SellerInfo>()
    for (const s of sellers) {
      sellersById.set(s.id, s as SellerInfo)
    }

    return rows.map((r) => ({
      ...r.listing,
      favoritedAt: r.favoritedAt,
      images: imageMap.get(r.listing.id) ?? [],
      seller: sellersById.get(r.listing.userId),
    }))
  }
}
