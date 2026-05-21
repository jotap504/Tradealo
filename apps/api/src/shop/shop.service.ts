import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, desc, count, gte } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import {
  sellerShops,
  shopGalleryImages,
  shopPinnedListings,
  shopSubscriptions,
  shopAnalyticsEvents,
} from '../database/schema';
import { StorageService } from '../storage/storage.service';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly storageService: StorageService,
  ) {}

  // ─── Subscription check ───────────────────────────────────────────────────────

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const [sub] = await this.db
      .select({ id: shopSubscriptions.id })
      .from(shopSubscriptions)
      .where(
        and(
          eq(shopSubscriptions.userId, userId),
          eq(shopSubscriptions.status, 'active'),
        ),
      )
      .limit(1);
    return !!sub;
  }

  // ─── Get or create own shop ───────────────────────────────────────────────────

  async getMyShop(userId: string) {
    const [shop] = await this.db
      .select()
      .from(sellerShops)
      .where(eq(sellerShops.userId, userId))
      .limit(1);

    if (!shop) return null;

    const [gallery, pinned, sub] = await Promise.all([
      this.db
        .select()
        .from(shopGalleryImages)
        .where(eq(shopGalleryImages.shopId, shop.id))
        .orderBy(shopGalleryImages.sortOrder),
      this.db
        .select()
        .from(shopPinnedListings)
        .where(eq(shopPinnedListings.shopId, shop.id))
        .orderBy(shopPinnedListings.sortOrder),
      this.db
        .select()
        .from(shopSubscriptions)
        .where(eq(shopSubscriptions.userId, userId))
        .orderBy(desc(shopSubscriptions.createdAt))
        .limit(1),
    ]);

    return {
      ...shop,
      gallery,
      pinnedListingIds: pinned.map((p) => p.listingId),
      subscription: sub[0] ?? null,
    };
  }

  async initShop(userId: string) {
    const [existing] = await this.db
      .select({ id: sellerShops.id })
      .from(sellerShops)
      .where(eq(sellerShops.userId, userId))
      .limit(1);

    if (existing) return existing;

    const [created] = await this.db
      .insert(sellerShops)
      .values({ userId })
      .returning();
    return created;
  }

  // ─── Public shop by username ──────────────────────────────────────────────────

  async getPublicShop(username: string) {
    const [profile] = await this.db
      .select({ userId: schema.userProfiles.userId })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.username, username))
      .limit(1);

    if (!profile) throw new NotFoundException('Shop not found');

    const [shop] = await this.db
      .select()
      .from(sellerShops)
      .where(
        and(
          eq(sellerShops.userId, profile.userId),
          eq(sellerShops.isPublished, true),
          eq(sellerShops.isActive, true),
        ),
      )
      .limit(1);

    if (!shop) throw new NotFoundException('Shop not found');

    const [gallery, pinned, seller, reputation] = await Promise.all([
      this.db
        .select()
        .from(shopGalleryImages)
        .where(eq(shopGalleryImages.shopId, shop.id))
        .orderBy(shopGalleryImages.sortOrder),
      this.db
        .select({ listingId: shopPinnedListings.listingId })
        .from(shopPinnedListings)
        .where(eq(shopPinnedListings.shopId, shop.id))
        .orderBy(shopPinnedListings.sortOrder),
      this.db
        .select({
          username: schema.userProfiles.username,
          avatarUrl: schema.userProfiles.avatarUrl,
          province: schema.userProfiles.province,
          city: schema.userProfiles.city,
          whatsapp: schema.userProfiles.whatsapp,
        })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, profile.userId))
        .limit(1),
      this.db
        .select()
        .from(schema.reputationScores)
        .where(eq(schema.reputationScores.userId, profile.userId))
        .limit(1),
    ]);

    return {
      ...shop,
      seller: { ...seller[0], reputation: reputation[0] ?? null },
      gallery,
      pinnedListingIds: pinned.map((p) => p.listingId),
    };
  }

  // ─── Update shop profile ──────────────────────────────────────────────────────

  async updateShopProfile(
    userId: string,
    dto: {
      shopName?: string;
      tagline?: string;
      about?: string;
      theme?: 'minimalista' | 'oscuro' | 'vibrante' | 'clasico' | 'boutique';
      whatsappBusiness?: string;
      socialLinks?: {
        instagram?: string;
        facebook?: string;
        tiktok?: string;
        youtube?: string;
        twitter?: string;
        website?: string;
      };
      businessHours?: Record<string, string>;
      locationText?: string;
      metaTitle?: string;
      metaDescription?: string;
    },
  ) {
    await this.ensureShopExists(userId);
    const [updated] = await this.db
      .update(sellerShops)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(sellerShops.userId, userId))
      .returning();
    return updated;
  }

  // ─── Logo / Banner upload ─────────────────────────────────────────────────────

  async uploadLogo(userId: string, data: string, mimetype: string) {
    const shop = await this.ensureShopExists(userId);
    const key = `shops/${shop.id}/logo/${Date.now()}.${this.mimeToExt(mimetype)}`;
    const url = await this.storageService.uploadBuffer(
      key,
      Buffer.from(data, 'base64'),
      mimetype,
    );
    const [updated] = await this.db
      .update(sellerShops)
      .set({ logoUrl: url, updatedAt: new Date() })
      .where(eq(sellerShops.userId, userId))
      .returning();
    return updated;
  }

  async uploadBanner(userId: string, data: string, mimetype: string) {
    const shop = await this.ensureShopExists(userId);
    const key = `shops/${shop.id}/banner/${Date.now()}.${this.mimeToExt(mimetype)}`;
    const url = await this.storageService.uploadBuffer(
      key,
      Buffer.from(data, 'base64'),
      mimetype,
    );
    const [updated] = await this.db
      .update(sellerShops)
      .set({ bannerUrl: url, updatedAt: new Date() })
      .where(eq(sellerShops.userId, userId))
      .returning();
    return updated;
  }

  // ─── Gallery ──────────────────────────────────────────────────────────────────

  async addGalleryImage(
    userId: string,
    data: string,
    mimetype: string,
    caption?: string,
  ) {
    const shop = await this.ensureShopExists(userId);
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(shopGalleryImages)
      .where(eq(shopGalleryImages.shopId, shop.id));

    if (Number(total) >= 10) {
      throw new BadRequestException('Maximum 10 gallery images allowed');
    }

    const key = `shops/${shop.id}/gallery/${Date.now()}.${this.mimeToExt(mimetype)}`;
    const url = await this.storageService.uploadBuffer(
      key,
      Buffer.from(data, 'base64'),
      mimetype,
    );
    const [image] = await this.db
      .insert(shopGalleryImages)
      .values({ shopId: shop.id, url, caption, sortOrder: Number(total) })
      .returning();
    return image;
  }

  async removeGalleryImage(userId: string, imageId: string) {
    const shop = await this.ensureShopExists(userId);
    const [img] = await this.db
      .select()
      .from(shopGalleryImages)
      .where(
        and(
          eq(shopGalleryImages.id, imageId),
          eq(shopGalleryImages.shopId, shop.id),
        ),
      )
      .limit(1);

    if (!img) throw new NotFoundException('Image not found');
    await this.db
      .delete(shopGalleryImages)
      .where(eq(shopGalleryImages.id, imageId));
    return { ok: true };
  }

  async reorderGalleryImages(userId: string, orderedIds: string[]) {
    const shop = await this.ensureShopExists(userId);
    await Promise.all(
      orderedIds.map((id, index) =>
        this.db
          .update(shopGalleryImages)
          .set({ sortOrder: index })
          .where(
            and(
              eq(shopGalleryImages.id, id),
              eq(shopGalleryImages.shopId, shop.id),
            ),
          ),
      ),
    );
    return { ok: true };
  }

  // ─── Pinned listings ──────────────────────────────────────────────────────────

  async pinListing(userId: string, listingId: string) {
    const shop = await this.ensureShopExists(userId);

    const [listing] = await this.db
      .select({ id: schema.listings.id })
      .from(schema.listings)
      .where(
        and(
          eq(schema.listings.id, listingId),
          eq(schema.listings.userId, userId),
        ),
      )
      .limit(1);

    if (!listing) throw new NotFoundException('Listing not found');

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(shopPinnedListings)
      .where(eq(shopPinnedListings.shopId, shop.id));

    if (Number(total) >= 6) {
      throw new BadRequestException('Maximum 6 pinned listings allowed');
    }

    await this.db
      .insert(shopPinnedListings)
      .values({ shopId: shop.id, listingId, sortOrder: Number(total) })
      .onConflictDoNothing();

    return { ok: true };
  }

  async unpinListing(userId: string, listingId: string) {
    const shop = await this.ensureShopExists(userId);
    await this.db
      .delete(shopPinnedListings)
      .where(
        and(
          eq(shopPinnedListings.shopId, shop.id),
          eq(shopPinnedListings.listingId, listingId),
        ),
      );
    return { ok: true };
  }

  async reorderPinnedListings(userId: string, orderedIds: string[]) {
    const shop = await this.ensureShopExists(userId);
    await Promise.all(
      orderedIds.map((listingId, index) =>
        this.db
          .update(shopPinnedListings)
          .set({ sortOrder: index })
          .where(
            and(
              eq(shopPinnedListings.shopId, shop.id),
              eq(shopPinnedListings.listingId, listingId),
            ),
          ),
      ),
    );
    return { ok: true };
  }

  // ─── Announcement ─────────────────────────────────────────────────────────────

  async setAnnouncement(
    userId: string,
    dto: { text?: string; expiresAt?: string },
  ) {
    await this.ensureShopExists(userId);
    const [updated] = await this.db
      .update(sellerShops)
      .set({
        announcementText: dto.text ?? null,
        announcementExpiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(sellerShops.userId, userId))
      .returning();
    return updated;
  }

  // ─── Publish / unpublish ──────────────────────────────────────────────────────

  async publishShop(userId: string) {
    const hasActive = await this.hasActiveSubscription(userId);
    if (!hasActive) {
      throw new ForbiddenException(
        'Active subscription required to publish shop',
      );
    }
    const [updated] = await this.db
      .update(sellerShops)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sellerShops.userId, userId))
      .returning();
    return updated;
  }

  async unpublishShop(userId: string) {
    const [updated] = await this.db
      .update(sellerShops)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(sellerShops.userId, userId))
      .returning();
    return updated;
  }

  // ─── Analytics ────────────────────────────────────────────────────────────────

  async trackEvent(dto: {
    shopId: string;
    eventType: string;
    visitorHash?: string;
    listingId?: string;
    sessionId?: string;
    referrer?: string;
  }) {
    await this.db.insert(shopAnalyticsEvents).values(dto).catch(() => null);
  }

  async getAnalytics(userId: string, days = 30) {
    const [shop] = await this.db
      .select({ id: sellerShops.id })
      .from(sellerShops)
      .where(eq(sellerShops.userId, userId))
      .limit(1);

    if (!shop) {
      return { pageViews: 0, listingClicks: 0, whatsappClicks: 0, chatbotSessions: 0 };
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.db
      .select({ eventType: shopAnalyticsEvents.eventType, total: count() })
      .from(shopAnalyticsEvents)
      .where(
        and(
          eq(shopAnalyticsEvents.shopId, shop.id),
          gte(shopAnalyticsEvents.createdAt, since),
        ),
      )
      .groupBy(shopAnalyticsEvents.eventType);

    const result: Record<string, number> = {};
    for (const row of rows) result[row.eventType] = Number(row.total);

    return {
      pageViews: result['page_view'] ?? 0,
      listingClicks: result['listing_click'] ?? 0,
      whatsappClicks: result['whatsapp_click'] ?? 0,
      chatbotSessions: result['chatbot_session'] ?? 0,
    };
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────────

  async getShopById(shopId: string) {
    const [shop] = await this.db
      .select()
      .from(sellerShops)
      .where(eq(sellerShops.id, shopId))
      .limit(1);
    return shop ?? null;
  }

  private async ensureShopExists(userId: string) {
    const [shop] = await this.db
      .select()
      .from(sellerShops)
      .where(eq(sellerShops.userId, userId))
      .limit(1);

    if (!shop) {
      const [created] = await this.db
        .insert(sellerShops)
        .values({ userId })
        .returning();
      return created;
    }
    return shop;
  }

  private mimeToExt(mimetype: string): string {
    if (mimetype === 'image/png') return 'png';
    if (mimetype === 'image/webp') return 'webp';
    if (mimetype === 'image/gif') return 'gif';
    return 'jpg';
  }
}
