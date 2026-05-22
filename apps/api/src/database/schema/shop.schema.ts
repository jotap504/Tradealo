import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  smallint,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { listings } from './listings.schema';
import { shopThemeEnum } from './enums';

export const sellerShops = pgTable(
  'seller_shops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 60 }),
    shopName: varchar('shop_name', { length: 100 }),
    tagline: varchar('tagline', { length: 200 }),
    logoUrl: varchar('logo_url', { length: 500 }),
    bannerUrl: varchar('banner_url', { length: 500 }),
    about: text('about'),
    theme: shopThemeEnum('theme').notNull().default('minimalista'),
    whatsappBusiness: varchar('whatsapp_business', { length: 20 }),
    socialLinks: jsonb('social_links').$type<{
      instagram?: string;
      facebook?: string;
      tiktok?: string;
      youtube?: string;
      twitter?: string;
      website?: string;
    }>(),
    businessHours: jsonb('business_hours'),
    locationText: varchar('location_text', { length: 300 }),
    metaTitle: varchar('meta_title', { length: 100 }),
    metaDescription: varchar('meta_description', { length: 300 }),
    ogImageUrl: varchar('og_image_url', { length: 500 }),
    categoryOrder: jsonb('category_order').$type<string[]>(),
    heroTemplate: varchar('hero_template', { length: 50 }).notNull().default('classic'),
    heroConfig: jsonb('hero_config').$type<Record<string, unknown>>(),
    announcementText: varchar('announcement_text', { length: 500 }),
    announcementExpiresAt: timestamp('announcement_expires_at', {
      withTimezone: true,
    }),
    isPublished: boolean('is_published').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_seller_shops_user').on(table.userId),
    uniqueIndex('idx_seller_shops_slug').on(table.slug),
    index('idx_seller_shops_published').on(table.isPublished, table.isActive),
  ],
);

export const shopGalleryImages = pgTable(
  'shop_gallery_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => sellerShops.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 500 }).notNull(),
    caption: varchar('caption', { length: 200 }),
    sortOrder: smallint('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_shop_gallery_shop').on(table.shopId, table.sortOrder)],
);

export const shopPinnedListings = pgTable(
  'shop_pinned_listings',
  {
    shopId: uuid('shop_id')
      .notNull()
      .references(() => sellerShops.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    sortOrder: smallint('sort_order').notNull().default(0),
    pinnedAt: timestamp('pinned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.shopId, table.listingId] }),
    index('idx_shop_pinned_shop').on(table.shopId, table.sortOrder),
  ],
);
