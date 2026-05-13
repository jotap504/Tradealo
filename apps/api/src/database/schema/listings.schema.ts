import {
  pgTable, uuid, varchar, text, boolean, integer,
  decimal, timestamp, smallint, index, jsonb, customType,
} from 'drizzle-orm/pg-core'
import { listingTypeEnum, listingStatusEnum, listingConditionEnum, currencyEnum } from './enums'
import { users } from './users.schema'

const geometryPoint = customType<{ data: string }>({
  dataType() { return 'geometry(Point, 4326)' },
})

export const categories = pgTable('categories', {
  id:           uuid('id').primaryKey().defaultRandom(),
  parentId:     uuid('parent_id'),
  name:         varchar('name', { length: 100 }).notNull(),
  slug:         varchar('slug', { length: 100 }).notNull().unique(),
  isCollectible: boolean('is_collectible').notNull().default(false),
  icon:         varchar('icon', { length: 100 }),
  sortOrder:    smallint('sort_order').notNull().default(0),
  isActive:     boolean('is_active').notNull().default(true),
})

export const categoryAttributes = pgTable('category_attributes', {
  id:         uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  key:        varchar('key', { length: 50 }).notNull(),
  label:      varchar('label', { length: 100 }).notNull(),
  type:       varchar('type', { length: 20 }).notNull(),
  options:    jsonb('options'),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder:  smallint('sort_order').notNull().default(0),
})

export const listings = pgTable('listings', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  userId:               uuid('user_id').notNull().references(() => users.id),
  categoryId:           uuid('category_id').notNull().references(() => categories.id),
  type:                 listingTypeEnum('type').notNull().default('standard'),
  status:               listingStatusEnum('status').notNull().default('draft'),
  isCollectible:        boolean('is_collectible').notNull().default(false),

  title:                varchar('title', { length: 150 }).notNull(),
  description:          text('description').notNull(),
  aiGenerated:          boolean('ai_generated').notNull().default(false),

  price:                decimal('price', { precision: 12, scale: 2 }).notNull(),
  currency:             currencyEnum('currency').notNull().default('ARS'),
  priceNegotiable:      boolean('price_negotiable').notNull().default(false),

  condition:            listingConditionEnum('condition').notNull(),

  saleType:             text('sale_type').notNull().default('contact'),
  stock:                integer('stock'),
  desiredPrice:         integer('desired_price'),

  location:             geometryPoint('location'),
  locationText:         varchar('location_text', { length: 200 }),
  city:                 varchar('city', { length: 100 }),
  province:             varchar('province', { length: 50 }),
  countryCode:          varchar('country_code', { length: 2 }).notNull().default('AR'),

  paymentMethods:       jsonb('payment_methods').notNull().default([]),
  shippingOptions:      jsonb('shipping_options').notNull().default([]),
  shippingDescription:  text('shipping_description'),

  collectibleAttributes: jsonb('collectible_attributes'),

  viewsCount:           integer('views_count').notNull().default(0),
  contactsCount:        integer('contacts_count').notNull().default(0),

  creditsSpent:         integer('credits_spent').notNull().default(0),
  wasFreeQuota:         boolean('was_free_quota').notNull().default(false),
  durationDays:         smallint('duration_days').notNull().default(30),

  moderationStatus:     varchar('moderation_status', { length: 20 }).notNull().default('pending'),
  riskScore:            smallint('risk_score').notNull().default(0),

  publishedAt:          timestamp('published_at', { withTimezone: true }),
  expiresAt:            timestamp('expires_at', { withTimezone: true }),
  soldAt:               timestamp('sold_at', { withTimezone: true }),
  deletedAt:            timestamp('deleted_at', { withTimezone: true }),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_listings_browse').on(table.countryCode, table.status, table.categoryId, table.createdAt),
  index('idx_listings_seller').on(table.userId, table.status, table.createdAt),
  index('idx_listings_expiry').on(table.expiresAt, table.status),
  index('idx_listings_price').on(table.countryCode, table.currency, table.price),
])

export const listingImages = pgTable('listing_images', {
  id:           uuid('id').primaryKey().defaultRandom(),
  listingId:    uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  url:          varchar('url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  r2Key:        varchar('r2_key', { length: 500 }).notNull(),
  sortOrder:    smallint('sort_order').notNull().default(0),
  isPrimary:    boolean('is_primary').notNull().default(false),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_listing_images_listing').on(table.listingId, table.sortOrder),
])

export const listingViews = pgTable('listing_views', {
  id:           uuid('id').primaryKey().defaultRandom(),
  listingId:    uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  viewerUserId: uuid('viewer_user_id'),
  ipHash:       varchar('ip_hash', { length: 64 }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_views_listing_date').on(table.listingId, table.createdAt),
])
