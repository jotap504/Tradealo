# TROCALIA — SDD v1.0
# Parte 2: Schema de Base de Datos Completo (Drizzle)

---

## SECCIÓN 5 — SCHEMA DE BASE DE DATOS COMPLETO

### 5.1 Setup inicial

```typescript
// apps/api/src/database/schema/index.ts
// Ejecutar antes de cualquier módulo:
// pnpm drizzle-kit generate
// pnpm drizzle-kit migrate

import { pgExtension } from 'drizzle-orm/pg-core'
export const postgis = pgExtension('postgis')
export const pgcrypto = pgExtension('pgcrypto')
```

### 5.2 Enums

```typescript
// apps/api/src/database/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core'

export const userStatusEnum = pgEnum('user_status', [
  'active', 'suspended', 'banned', 'deleted'
])

export const userRoleEnum = pgEnum('user_role', [
  'user', 'verified_user', 'moderator', 'support', 'finance', 'partner', 'super_admin'
])

export const kycTypeEnum = pgEnum('kyc_type', [
  'email', 'phone', 'dni', 'address', 'selfie'
])

export const kycStatusEnum = pgEnum('kyc_status', [
  'pending', 'approved', 'rejected', 'expired'
])

export const listingTypeEnum = pgEnum('listing_type', [
  'standard', 'premium'
  // 'auction', 'exchange_same', 'exchange_diff' — Fase 2
])

export const listingStatusEnum = pgEnum('listing_status', [
  'draft', 'active', 'paused', 'sold', 'expired', 'removed'
])

export const listingConditionEnum = pgEnum('listing_condition', [
  'new', 'used', 'refurbished'
])

export const currencyEnum = pgEnum('currency', ['ARS', 'USD'])

export const creditReasonEnum = pgEnum('credit_reason', [
  'registration_bonus',
  'profile_complete',
  'kyc_phone',
  'kyc_dni',
  'kyc_address',
  'kyc_selfie',
  'first_sale',
  'referral_signup',
  'referral_first_sale',
  'review_given',
  'monthly_quota',
  'token_purchase',
  'listing_publish',
  'listing_feature',
  'listing_renewal',
  'ai_generation',
  'refund',
  'admin_adjustment',
  'token_expired'
])

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email', 'push', 'in_app'
])

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending', 'sent', 'failed', 'read'
])

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending', 'approved', 'rejected', 'flagged'
])

export const configDataTypeEnum = pgEnum('config_data_type', [
  'integer', 'decimal', 'boolean', 'string', 'json', 'select', 'multi_select'
])
```

### 5.3 Tabla: users

```typescript
// apps/api/src/database/schema/users.schema.ts
import { pgTable, uuid, varchar, boolean, smallint,
         timestamp, char, text, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { userStatusEnum, userRoleEnum } from './enums'

export const users = pgTable('users', {
  id:             uuid('id').primaryKey().defaultRandom(),
  email:          varchar('email', { length: 255 }).notNull().unique(),
  phone:          varchar('phone', { length: 20 }).unique(),
  passwordHash:   varchar('password_hash', { length: 255 }).notNull(),
  role:           userRoleEnum('role').notNull().default('user'),
  status:         userStatusEnum('status').notNull().default('active'),
  kycLevel:       smallint('kyc_level').notNull().default(0),
  // 0=solo registro, 1=email+phone, 2=DNI, 3=domicilio, 4=selfie
  countryCode:    char('country_code', { length: 2 }).notNull().default('AR'),
  emailVerified:  boolean('email_verified').notNull().default(false),
  phoneVerified:  boolean('phone_verified').notNull().default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 64 }),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  referralCode:   varchar('referral_code', { length: 12 }).unique(),
  referredBy:     uuid('referred_by').references((): any => users.id),
  lastLoginAt:    timestamp('last_login_at', { withTimezone: true }),
  deletedAt:      timestamp('deleted_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx:       uniqueIndex('idx_users_email').on(table.email),
  phoneIdx:       uniqueIndex('idx_users_phone').on(table.phone),
  referralIdx:    uniqueIndex('idx_users_referral_code').on(table.referralCode),
  statusIdx:      index('idx_users_status').on(table.status),
}))

export const userProfiles = pgTable('user_profiles', {
  userId:         uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  username:       varchar('username', { length: 30 }).unique(),
  firstName:      varchar('first_name', { length: 100 }),
  lastName:       varchar('last_name', { length: 100 }),
  avatarUrl:      varchar('avatar_url', { length: 500 }),
  bio:            text('bio'),
  whatsapp:       varchar('whatsapp', { length: 20 }),
  showPhone:      boolean('show_phone').notNull().default(false),
  province:       varchar('province', { length: 50 }),
  city:           varchar('city', { length: 100 }),
  completenessPct: smallint('completeness_pct').notNull().default(0),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userVerifications = pgTable('user_verifications', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:           kycTypeEnum('type').notNull(),
  status:         kycStatusEnum('status').notNull().default('pending'),
  // Para DNI y selfie: referencia al objeto en S3 (NUNCA url pública)
  s3Key:          varchar('s3_key', { length: 500 }),
  // Para DNI: el número (encriptado a nivel aplicación antes de guardar)
  verificationData: varchar('verification_data', { length: 500 }),
  rejectionReason: text('rejection_reason'),
  verifiedAt:     timestamp('verified_at', { withTimezone: true }),
  verifiedBy:     uuid('verified_by'), // null = automático
  expiresAt:      timestamp('expires_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userTypeIdx:    index('idx_verifications_user_type').on(table.userId, table.type),
}))

export const refreshTokens = pgTable('refresh_tokens', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash:      varchar('token_hash', { length: 255 }).notNull().unique(),
  deviceId:       varchar('device_id', { length: 100 }),
  deviceInfo:     varchar('device_info', { length: 255 }),
  ipAddress:      varchar('ip_address', { length: 45 }),
  revokedAt:      timestamp('revoked_at', { withTimezone: true }),
  expiresAt:      timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx:        index('idx_refresh_tokens_user').on(table.userId),
  hashIdx:        uniqueIndex('idx_refresh_tokens_hash').on(table.tokenHash),
}))
```

### 5.4 Tabla: tokens y wallet

```typescript
// apps/api/src/database/schema/tokens.schema.ts
import { pgTable, uuid, integer, varchar, timestamp,
         boolean, decimal, index, uniqueIndex, char } from 'drizzle-orm/pg-core'
import { creditReasonEnum } from './enums'
import { users } from './users.schema'

export const wallets = pgTable('wallets', {
  userId:         uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  balance:        integer('balance').notNull().default(0),
  // INVARIANTE: balance >= 0 SIEMPRE. Verificar en WalletService antes de debitar.
  lifetimeEarned: integer('lifetime_earned').notNull().default(0),
  lifetimeSpent:  integer('lifetime_spent').notNull().default(0),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const creditTransactions = pgTable('credit_transactions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id),
  // Positivo = ganancia, Negativo = gasto
  amount:         integer('amount').notNull(),
  balanceAfter:   integer('balance_after').notNull(),
  reason:         creditReasonEnum('reason').notNull(),
  // ID del recurso relacionado (listing_id, order_id, etc.)
  referenceId:    uuid('reference_id'),
  referenceType:  varchar('reference_type', { length: 50 }),
  // Solo para tokens comprados — tienen vencimiento
  expiresAt:      timestamp('expires_at', { withTimezone: true }),
  // INMUTABLE: nunca actualizar este registro, solo insertar
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userDateIdx:    index('idx_credit_txn_user_date').on(table.userId, table.createdAt),
  expiryIdx:      index('idx_credit_txn_expiry').on(table.expiresAt),
}))

export const freeListingQuotas = pgTable('free_listing_quotas', {
  userId:         uuid('user_id').notNull().references(() => users.id),
  yearMonth:      char('year_month', { length: 7 }).notNull(), // '2026-04'
  quota:          integer('quota').notNull().default(0),
  used:           integer('used').notNull().default(0),
}, (table) => ({
  pk:             index('idx_free_quota_pk').on(table.userId, table.yearMonth),
}))

export const tokenPackDefinitions = pgTable('token_pack_definitions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  key:            varchar('key', { length: 50 }).notNull().unique(),
  label:          varchar('label', { length: 100 }).notNull(),
  tokens:         integer('tokens').notNull(),
  bonusPct:       integer('bonus_pct').notNull().default(0),
  // tokensTotal se calcula: tokens + floor(tokens * bonusPct / 100)
  isActive:       boolean('is_active').notNull().default(true),
  isFeatured:     boolean('is_featured').notNull().default(false),
  sortOrder:      integer('sort_order').notNull().default(0),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tokenPackPrices = pgTable('token_pack_prices', {
  id:             uuid('id').primaryKey().defaultRandom(),
  packId:         uuid('pack_id').notNull().references(() => tokenPackDefinitions.id),
  countryCode:    char('country_code', { length: 2 }).notNull().default('AR'),
  price:          decimal('price', { precision: 12, scale: 2 }).notNull(),
  currencyCode:   char('currency_code', { length: 3 }).notNull().default('ARS'),
  isActive:       boolean('is_active').notNull().default(true),
  updatedBy:      uuid('updated_by'),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  packCountryIdx: uniqueIndex('idx_pack_prices_pack_country').on(table.packId, table.countryCode),
}))

export const tokenPurchases = pgTable('token_purchases', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id),
  packId:         uuid('pack_id').notNull().references(() => tokenPackDefinitions.id),
  tokensGranted:  integer('tokens_granted').notNull(),
  amountPaid:     decimal('amount_paid', { precision: 12, scale: 2 }).notNull(),
  currency:       char('currency', { length: 3 }).notNull(),
  gateway:        varchar('gateway', { length: 50 }).notNull().default('mercadopago'),
  gatewayOrderId: varchar('gateway_order_id', { length: 255 }).unique(),
  gatewayPaymentId: varchar('gateway_payment_id', { length: 255 }).unique(),
  status:         varchar('status', { length: 50 }).notNull().default('pending'),
  // pending | approved | rejected | refunded
  promotionId:    uuid('promotion_id'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx:        index('idx_purchases_user').on(table.userId),
  gatewayOrderIdx: uniqueIndex('idx_purchases_gateway_order').on(table.gatewayOrderId),
}))

export const promotions = pgTable('promotions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  key:            varchar('key', { length: 100 }).notNull().unique(),
  name:           varchar('name', { length: 200 }).notNull(),
  type:           varchar('type', { length: 50 }).notNull(),
  // 'discount_pct' | 'bonus_tokens' | 'first_purchase'
  discountPct:    integer('discount_pct'),
  bonusPctExtra:  integer('bonus_pct_extra'),
  bonusTokensExtra: integer('bonus_tokens_extra'),
  couponCode:     varchar('coupon_code', { length: 50 }).unique(),
  maxUsesTotal:   integer('max_uses_total'),
  maxUsesPerUser: integer('max_uses_per_user').notNull().default(1),
  usesCount:      integer('uses_count').notNull().default(0),
  appliesFirstPurchaseOnly: boolean('applies_first_purchase_only').notNull().default(false),
  startsAt:       timestamp('starts_at', { withTimezone: true }),
  endsAt:         timestamp('ends_at', { withTimezone: true }),
  isActive:       boolean('is_active').notNull().default(false),
  createdBy:      uuid('created_by').notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 5.5 Tabla: listings

```typescript
// apps/api/src/database/schema/listings.schema.ts
import { pgTable, uuid, varchar, text, boolean, integer,
         decimal, timestamp, smallint, index, jsonb,
         customType } from 'drizzle-orm/pg-core'
import { listingTypeEnum, listingStatusEnum,
         listingConditionEnum, currencyEnum } from './enums'
import { users } from './users.schema'

// Tipo personalizado para PostGIS geometry point
const geometryPoint = customType<{ data: string }>({
  dataType() { return 'geometry(Point, 4326)' },
})

export const categories = pgTable('categories', {
  id:             uuid('id').primaryKey().defaultRandom(),
  parentId:       uuid('parent_id'),
  // parentId references categories.id — self-referential
  name:           varchar('name', { length: 100 }).notNull(),
  slug:           varchar('slug', { length: 100 }).notNull().unique(),
  isCollectible:  boolean('is_collectible').notNull().default(false),
  icon:           varchar('icon', { length: 100 }),
  sortOrder:      smallint('sort_order').notNull().default(0),
  isActive:       boolean('is_active').notNull().default(true),
})

export const categoryAttributes = pgTable('category_attributes', {
  id:             uuid('id').primaryKey().defaultRandom(),
  categoryId:     uuid('category_id').notNull().references(() => categories.id),
  key:            varchar('key', { length: 50 }).notNull(),
  label:          varchar('label', { length: 100 }).notNull(),
  type:           varchar('type', { length: 20 }).notNull(),
  // 'text' | 'number' | 'select' | 'boolean'
  options:        jsonb('options'),  // para type='select': ["Excelente","Bueno","Regular"]
  isRequired:     boolean('is_required').notNull().default(false),
  sortOrder:      smallint('sort_order').notNull().default(0),
})

export const listings = pgTable('listings', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id),
  categoryId:     uuid('category_id').notNull().references(() => categories.id),
  type:           listingTypeEnum('type').notNull().default('standard'),
  status:         listingStatusEnum('status').notNull().default('draft'),
  isCollectible:  boolean('is_collectible').notNull().default(false),

  // Contenido
  title:          varchar('title', { length: 150 }).notNull(),
  description:    text('description').notNull(),
  aiGenerated:    boolean('ai_generated').notNull().default(false),

  // Precio
  price:          decimal('price', { precision: 12, scale: 2 }).notNull(),
  currency:       currencyEnum('currency').notNull().default('ARS'),
  priceNegotiable: boolean('price_negotiable').notNull().default(false),

  // Condición
  condition:      listingConditionEnum('condition').notNull(),

  // Ubicación (PostGIS)
  location:       geometryPoint('location'),
  locationText:   varchar('location_text', { length: 200 }),
  city:           varchar('city', { length: 100 }),
  province:       varchar('province', { length: 50 }),
  countryCode:    varchar('country_code', { length: 2 }).notNull().default('AR'),

  // Pago y envío (declarativo — los usuarios acuerdan entre ellos)
  paymentMethods: jsonb('payment_methods').notNull().default([]),
  // ['cash','bank_transfer','mercadopago','uala','other']
  shippingOptions: jsonb('shipping_options').notNull().default([]),
  // ['pickup_only','buyer_pays','seller_pays','to_be_agreed']
  shippingDescription: text('shipping_description'),

  // Atributos dinámicos para coleccionables
  collectibleAttributes: jsonb('collectible_attributes'),

  // Métricas
  viewsCount:     integer('views_count').notNull().default(0),
  contactsCount:  integer('contacts_count').notNull().default(0),

  // Tokens
  creditsSpent:   integer('credits_spent').notNull().default(0),
  wasFreeQuota:   boolean('was_free_quota').notNull().default(false),
  durationDays:   smallint('duration_days').notNull().default(30),

  // Moderación
  moderationStatus: varchar('moderation_status', { length: 20 }).notNull().default('pending'),
  // 'pending' | 'approved' | 'rejected' | 'flagged'
  riskScore:      smallint('risk_score').notNull().default(0),

  // Fechas
  publishedAt:    timestamp('published_at', { withTimezone: true }),
  expiresAt:      timestamp('expires_at', { withTimezone: true }),
  soldAt:         timestamp('sold_at', { withTimezone: true }),
  deletedAt:      timestamp('deleted_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Índice principal de búsqueda
  browseIdx:      index('idx_listings_browse').on(
                    table.countryCode, table.status, table.categoryId, table.createdAt
                  ),
  // Índice de vendedor (mis publicaciones)
  sellerIdx:      index('idx_listings_seller').on(table.userId, table.status, table.createdAt),
  // Índice de expiración (job nocturno)
  expiryIdx:      index('idx_listings_expiry').on(table.expiresAt, table.status),
  // Índice de precio
  priceIdx:       index('idx_listings_price').on(table.countryCode, table.currency, table.price),
  // NOTA: el índice de location (PostGIS GIST) se crea en una migración separada:
  // CREATE INDEX CONCURRENTLY idx_listings_location ON listings USING GIST(location);
}))

export const listingImages = pgTable('listing_images', {
  id:             uuid('id').primaryKey().defaultRandom(),
  listingId:      uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  url:            varchar('url', { length: 500 }).notNull(),
  thumbnailUrl:   varchar('thumbnail_url', { length: 500 }),
  r2Key:          varchar('r2_key', { length: 500 }).notNull(),
  sortOrder:      smallint('sort_order').notNull().default(0),
  isPrimary:      boolean('is_primary').notNull().default(false),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  listingIdx:     index('idx_listing_images_listing').on(table.listingId, table.sortOrder),
}))

export const listingViews = pgTable('listing_views', {
  id:             uuid('id').primaryKey().defaultRandom(),
  listingId:      uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  viewerUserId:   uuid('viewer_user_id'),  // null si no autenticado
  ipHash:         varchar('ip_hash', { length: 64 }),  // hash de IP para deduplicar
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  listingDateIdx: index('idx_views_listing_date').on(table.listingId, table.createdAt),
}))
```

### 5.6 Tabla: reviews y reputación

```typescript
// apps/api/src/database/schema/reviews.schema.ts
import { pgTable, uuid, smallint, text, boolean,
         decimal, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users.schema'
import { listings } from './listings.schema'

export const reviews = pgTable('reviews', {
  id:             uuid('id').primaryKey().defaultRandom(),
  listingId:      uuid('listing_id').notNull().references(() => listings.id),
  reviewerId:     uuid('reviewer_id').notNull().references(() => users.id),
  reviewedId:     uuid('reviewed_id').notNull().references(() => users.id),
  // 'buyer_to_seller' | 'seller_to_buyer'
  direction:      varchar('direction', { length: 20 }).notNull(),
  overallRating:  smallint('overall_rating').notNull(),
  // 1-5 estrellas. Validar: >= 1 && <= 5
  comment:        text('comment'),
  isPublic:       boolean('is_public').notNull().default(true),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Un usuario solo puede dejar una review por listing por dirección
  uniqueReview:   uniqueIndex('idx_reviews_unique').on(
                    table.listingId, table.reviewerId, table.direction
                  ),
  reviewedIdx:    index('idx_reviews_reviewed').on(table.reviewedId, table.createdAt),
}))

export const reputationScores = pgTable('reputation_scores', {
  userId:         uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  asSellerAvg:    decimal('as_seller_avg', { precision: 3, scale: 2 }).default('0'),
  asSellerCount:  integer('as_seller_count').notNull().default(0),
  asBuyerAvg:     decimal('as_buyer_avg', { precision: 3, scale: 2 }).default('0'),
  asBuyerCount:   integer('as_buyer_count').notNull().default(0),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 5.7 Tabla: config del sistema

```typescript
// apps/api/src/database/schema/config.schema.ts
import { pgTable, uuid, varchar, text, boolean,
         jsonb, timestamp } from 'drizzle-orm/pg-core'
import { configDataTypeEnum } from './enums'

export const systemConfigs = pgTable('system_configs', {
  id:             uuid('id').primaryKey().defaultRandom(),
  key:            varchar('key', { length: 100 }).notNull().unique(),
  category:       varchar('category', { length: 50 }).notNull(),
  label:          varchar('label', { length: 200 }).notNull(),
  description:    text('description'),
  value:          jsonb('value').notNull(),
  defaultValue:   jsonb('default_value').notNull(),
  dataType:       configDataTypeEnum('data_type').notNull(),
  validation:     jsonb('validation'),
  // Para integer: {"min": 0, "max": 1000}
  // Para select:  {"options": ["30","60","90","120"]}
  unit:           varchar('unit', { length: 20 }),
  isPublic:       boolean('is_public').notNull().default(false),
  updatedBy:      uuid('updated_by'),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const systemConfigHistory = pgTable('system_config_history', {
  id:             uuid('id').primaryKey().defaultRandom(),
  configKey:      varchar('config_key', { length: 100 }).notNull(),
  oldValue:       jsonb('old_value').notNull(),
  newValue:       jsonb('new_value').notNull(),
  changedBy:      uuid('changed_by').notNull(),
  changeReason:   text('change_reason').notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adminUsers = pgTable('admin_users', {
  id:             uuid('id').primaryKey().defaultRandom(),
  email:          varchar('email', { length: 255 }).notNull().unique(),
  passwordHash:   varchar('password_hash', { length: 255 }).notNull(),
  role:           varchar('role', { length: 50 }).notNull(),
  // 'super_admin' | 'partner' | 'finance' | 'support' | 'moderator'
  totpSecret:     varchar('totp_secret', { length: 64 }),
  totpEnabled:    boolean('totp_enabled').notNull().default(false),
  isActive:       boolean('is_active').notNull().default(true),
  lastLoginAt:    timestamp('last_login_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adminAuditLog = pgTable('admin_audit_log', {
  id:             uuid('id').primaryKey().defaultRandom(),
  adminId:        uuid('admin_id').notNull().references(() => adminUsers.id),
  action:         varchar('action', { length: 100 }).notNull(),
  entityType:     varchar('entity_type', { length: 50 }),
  entityId:       varchar('entity_id', { length: 100 }),
  oldValue:       jsonb('old_value'),
  newValue:       jsonb('new_value'),
  ipAddress:      varchar('ip_address', { length: 45 }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // INMUTABLE: nunca actualizar ni borrar registros de este tabla
})
```

### 5.8 Tabla: notificaciones

```typescript
// apps/api/src/database/schema/notifications.schema.ts
import { pgTable, uuid, varchar, text, boolean,
         jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { notificationChannelEnum, notificationStatusEnum } from './enums'
import { users } from './users.schema'

export const notifications = pgTable('notifications', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel:        notificationChannelEnum('channel').notNull(),
  type:           varchar('type', { length: 100 }).notNull(),
  // 'listing_published' | 'listing_expiring' | 'listing_sold' |
  // 'tokens_received' | 'tokens_low' | 'kyc_approved' | 'kyc_rejected' |
  // 'review_received' | 'contact_received'
  title:          varchar('title', { length: 200 }).notNull(),
  body:           text('body').notNull(),
  data:           jsonb('data'),
  status:         notificationStatusEnum('status').notNull().default('pending'),
  readAt:         timestamp('read_at', { withTimezone: true }),
  sentAt:         timestamp('sent_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userUnreadIdx:  index('idx_notifications_user_unread').on(table.userId, table.readAt),
  statusIdx:      index('idx_notifications_status').on(table.status, table.createdAt),
}))

export const contactInquiries = pgTable('contact_inquiries', {
  id:             uuid('id').primaryKey().defaultRandom(),
  listingId:      uuid('listing_id').notNull().references((): any => listings.id),
  senderUserId:   uuid('sender_user_id').references(() => users.id),
  senderName:     varchar('sender_name', { length: 100 }),
  senderEmail:    varchar('sender_email', { length: 255 }),
  message:        text('message').notNull(),
  // El vendedor recibe esta consulta por email
  emailSent:      boolean('email_sent').notNull().default(false),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 5.9 Seed de configuración inicial (ejecutar en PASO 03)

```typescript
// apps/api/src/database/seeds/config.seed.ts
// Este seed debe ejecutarse una sola vez al inicializar la aplicación.
// El CEO Panel lee estos valores. Si la key no existe en DB → error en runtime.

export const CONFIG_SEED = [
  // ─── TOKENS: recompensas ───────────────────────────────
  { key: 'tokens.reward.registration',    category: 'tokens_rewards', label: 'Tokens al registrarse',          dataType: 'integer', value: 5,   defaultValue: 5,  unit: 'tokens', validation: { min: 0, max: 100 } },
  { key: 'tokens.reward.kyc.phone',       category: 'tokens_rewards', label: 'Tokens por verificar teléfono',  dataType: 'integer', value: 3,   defaultValue: 3,  unit: 'tokens', validation: { min: 0, max: 100 } },
  { key: 'tokens.reward.kyc.dni',         category: 'tokens_rewards', label: 'Tokens por verificar DNI',       dataType: 'integer', value: 15,  defaultValue: 15, unit: 'tokens', validation: { min: 0, max: 200 } },
  { key: 'tokens.reward.kyc.address',     category: 'tokens_rewards', label: 'Tokens por verificar domicilio', dataType: 'integer', value: 10,  defaultValue: 10, unit: 'tokens', validation: { min: 0, max: 200 } },
  { key: 'tokens.reward.kyc.selfie',      category: 'tokens_rewards', label: 'Tokens por selfie verificada',   dataType: 'integer', value: 10,  defaultValue: 10, unit: 'tokens', validation: { min: 0, max: 200 } },
  { key: 'tokens.reward.first_sale',      category: 'tokens_rewards', label: 'Tokens por primera venta',       dataType: 'integer', value: 5,   defaultValue: 5,  unit: 'tokens', validation: { min: 0, max: 100 } },
  { key: 'tokens.reward.referral.signup', category: 'tokens_rewards', label: 'Tokens por referido registrado', dataType: 'integer', value: 5,   defaultValue: 5,  unit: 'tokens', validation: { min: 0, max: 100 } },
  { key: 'tokens.reward.review_given',    category: 'tokens_rewards', label: 'Tokens por dejar una reseña',    dataType: 'integer', value: 1,   defaultValue: 1,  unit: 'tokens', validation: { min: 0, max: 20  } },

  // ─── TOKENS: cuotas gratuitas ──────────────────────────
  { key: 'tokens.quota.monthly',          category: 'tokens_quota',   label: 'Publicaciones gratis por mes',   dataType: 'integer', value: 5,   defaultValue: 5,  unit: 'publicaciones', validation: { min: 0, max: 50 } },
  { key: 'tokens.quota.on_registration',  category: 'tokens_quota',   label: 'Publicaciones gratis al inicio', dataType: 'integer', value: 3,   defaultValue: 3,  unit: 'publicaciones', validation: { min: 0, max: 20 } },

  // ─── LISTINGS: costos ──────────────────────────────────
  { key: 'listing.cost.standard',         category: 'listing_costs',  label: 'Tokens: publicación standard',   dataType: 'integer', value: 2,   defaultValue: 2,  unit: 'tokens', validation: { min: 0, max: 100 } },
  { key: 'listing.cost.premium',          category: 'listing_costs',  label: 'Tokens: publicación premium',    dataType: 'integer', value: 5,   defaultValue: 5,  unit: 'tokens', validation: { min: 0, max: 100 } },
  { key: 'listing.cost.collectible',      category: 'listing_costs',  label: 'Tokens: publicación coleccionable', dataType: 'integer', value: 3, defaultValue: 3, unit: 'tokens', validation: { min: 0, max: 100 } },
  { key: 'listing.cost.renewal_pct',      category: 'listing_costs',  label: '% descuento al renovar',         dataType: 'integer', value: 50,  defaultValue: 50, unit: '%',      validation: { min: 0, max: 100 } },

  // ─── LISTINGS: duración ────────────────────────────────
  { key: 'listing.duration.available',    category: 'listing_duration', label: 'Duraciones disponibles (días)', dataType: 'json', value: [30,60,90], defaultValue: [30,60,90], validation: null },
  { key: 'listing.duration.default',      category: 'listing_duration', label: 'Duración por defecto (días)',   dataType: 'integer', value: 30,  defaultValue: 30, unit: 'días',   validation: { min: 1, max: 365 } },
  { key: 'listing.duration.multiplier.30', category: 'listing_duration', label: 'Multiplicador 30 días',        dataType: 'decimal', value: 1.0, defaultValue: 1.0, validation: { min: 0.1, max: 10 } },
  { key: 'listing.duration.multiplier.60', category: 'listing_duration', label: 'Multiplicador 60 días',        dataType: 'decimal', value: 1.5, defaultValue: 1.5, validation: { min: 0.1, max: 10 } },
  { key: 'listing.duration.multiplier.90', category: 'listing_duration', label: 'Multiplicador 90 días',        dataType: 'decimal', value: 1.8, defaultValue: 1.8, validation: { min: 0.1, max: 10 } },

  // ─── IA ────────────────────────────────────────────────
  { key: 'ai.text.enabled',               category: 'ai',             label: 'IA generación de texto activa',  dataType: 'boolean', value: true,  defaultValue: true,  validation: null },
  { key: 'ai.text.provider',              category: 'ai',             label: 'Proveedor IA texto',             dataType: 'select',  value: 'deepseek', defaultValue: 'deepseek', validation: { options: ['deepseek','qwen'] } },
  { key: 'ai.text.model',                 category: 'ai',             label: 'Modelo IA texto',                dataType: 'string',  value: 'deepseek-chat', defaultValue: 'deepseek-chat', validation: null },
  { key: 'ai.daily_limit_per_user',       category: 'ai',             label: 'Generaciones IA por día/usuario',dataType: 'integer', value: 10,  defaultValue: 10, unit: 'generaciones', validation: { min: 0, max: 100 } },

  // ─── FEATURE FLAGS ─────────────────────────────────────
  { key: 'features.premium_listings',     category: 'features',       label: 'Publicaciones premium activas',  dataType: 'boolean', value: true,  defaultValue: true,  validation: null },
  { key: 'features.collectibles',         category: 'features',       label: 'Coleccionables activos',         dataType: 'boolean', value: true,  defaultValue: true,  validation: null },
  { key: 'features.ai_generation',        category: 'features',       label: 'Generación IA activa',           dataType: 'boolean', value: true,  defaultValue: true,  validation: null },
  { key: 'features.new_registrations',    category: 'features',       label: 'Nuevos registros permitidos',    dataType: 'boolean', value: true,  defaultValue: true,  validation: null },
  { key: 'features.maintenance_mode',     category: 'features',       label: 'Modo mantenimiento',             dataType: 'boolean', value: false, defaultValue: false, validation: null },

  // ─── MODERACIÓN ────────────────────────────────────────
  { key: 'moderation.auto_approve_verified', category: 'moderation',  label: 'Auto-aprobar listings de usuarios verificados', dataType: 'boolean', value: true, defaultValue: true, validation: null },
  { key: 'moderation.risk_score_auto_reject', category: 'moderation', label: 'Score de riesgo para rechazo automático',        dataType: 'integer', value: 80,  defaultValue: 80,   unit: 'pts', validation: { min: 0, max: 100 } },
  { key: 'moderation.risk_score_manual_review', category: 'moderation', label: 'Score de riesgo para revisión manual',         dataType: 'integer', value: 40,  defaultValue: 40,   unit: 'pts', validation: { min: 0, max: 100 } },
]
```
