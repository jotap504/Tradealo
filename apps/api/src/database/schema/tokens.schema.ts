import {
  pgTable, uuid, integer, varchar, timestamp,
  boolean, decimal, index, uniqueIndex, char,
} from 'drizzle-orm/pg-core'
import { creditReasonEnum } from './enums'
import { users } from './users.schema'

export const wallets = pgTable('wallets', {
  userId:         uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  balance:        integer('balance').notNull().default(0),
  lifetimeEarned: integer('lifetime_earned').notNull().default(0),
  lifetimeSpent:  integer('lifetime_spent').notNull().default(0),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const creditTransactions = pgTable('credit_transactions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').notNull().references(() => users.id),
  amount:        integer('amount').notNull(),
  balanceAfter:  integer('balance_after').notNull(),
  reason:        creditReasonEnum('reason').notNull(),
  referenceId:   uuid('reference_id'),
  referenceType: varchar('reference_type', { length: 50 }),
  expiresAt:     timestamp('expires_at', { withTimezone: true }),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_credit_txn_user_date').on(table.userId, table.createdAt),
  index('idx_credit_txn_expiry').on(table.expiresAt),
])

export const freeListingQuotas = pgTable('free_listing_quotas', {
  userId:    uuid('user_id').notNull().references(() => users.id),
  yearMonth: char('year_month', { length: 7 }).notNull(),
  quota:     integer('quota').notNull().default(0),
  used:      integer('used').notNull().default(0),
}, (table) => [
  index('idx_free_quota_pk').on(table.userId, table.yearMonth),
])

export const tokenPackDefinitions = pgTable('token_pack_definitions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  key:        varchar('key', { length: 50 }).notNull().unique(),
  label:      varchar('label', { length: 100 }).notNull(),
  tokens:     integer('tokens').notNull(),
  bonusPct:   integer('bonus_pct').notNull().default(0),
  isActive:   boolean('is_active').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder:  integer('sort_order').notNull().default(0),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tokenPackPrices = pgTable('token_pack_prices', {
  id:           uuid('id').primaryKey().defaultRandom(),
  packId:       uuid('pack_id').notNull().references(() => tokenPackDefinitions.id),
  countryCode:  char('country_code', { length: 2 }).notNull().default('AR'),
  price:        decimal('price', { precision: 12, scale: 2 }).notNull(),
  currencyCode: char('currency_code', { length: 3 }).notNull().default('ARS'),
  isActive:     boolean('is_active').notNull().default(true),
  updatedBy:    uuid('updated_by'),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_pack_prices_pack_country').on(table.packId, table.countryCode),
])

export const tokenPurchases = pgTable('token_purchases', {
  id:                uuid('id').primaryKey().defaultRandom(),
  userId:            uuid('user_id').notNull().references(() => users.id),
  packId:            uuid('pack_id').notNull().references(() => tokenPackDefinitions.id),
  tokensGranted:     integer('tokens_granted').notNull(),
  amountPaid:        decimal('amount_paid', { precision: 12, scale: 2 }).notNull(),
  currency:          char('currency', { length: 3 }).notNull(),
  gateway:           varchar('gateway', { length: 50 }).notNull().default('mercadopago'),
  gatewayOrderId:    varchar('gateway_order_id', { length: 255 }).unique(),
  gatewayPaymentId:  varchar('gateway_payment_id', { length: 255 }).unique(),
  status:            varchar('status', { length: 50 }).notNull().default('pending'),
  promotionId:       uuid('promotion_id'),
  idempotencyKey:    varchar('idempotency_key', { length: 255 }).unique(),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_purchases_user').on(table.userId),
  uniqueIndex('idx_purchases_gateway_order').on(table.gatewayOrderId),
])

export const promotions = pgTable('promotions', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  key:                      varchar('key', { length: 100 }).notNull().unique(),
  name:                     varchar('name', { length: 200 }).notNull(),
  type:                     varchar('type', { length: 50 }).notNull(),
  discountPct:              integer('discount_pct'),
  bonusPctExtra:            integer('bonus_pct_extra'),
  bonusTokensExtra:         integer('bonus_tokens_extra'),
  couponCode:               varchar('coupon_code', { length: 50 }).unique(),
  maxUsesTotal:             integer('max_uses_total'),
  maxUsesPerUser:           integer('max_uses_per_user').notNull().default(1),
  usesCount:                integer('uses_count').notNull().default(0),
  appliesFirstPurchaseOnly: boolean('applies_first_purchase_only').notNull().default(false),
  startsAt:                 timestamp('starts_at', { withTimezone: true }),
  endsAt:                   timestamp('ends_at', { withTimezone: true }),
  isActive:                 boolean('is_active').notNull().default(false),
  createdBy:                uuid('created_by').notNull(),
  createdAt:                timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
