import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  integer,
  numeric,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { listings } from './listings.schema';

export const agentCartStatusEnum = pgEnum('agent_cart_status', [
  'pending_payment',
  'paid',
  'cancelled',
  'failed',
]);

export const agentCarts = pgTable(
  'agent_carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buyerEmail: varchar('buyer_email', { length: 254 }).notNull(),
    buyerUserId: uuid('buyer_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: agentCartStatusEnum('status').notNull().default('pending_payment'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    shippingAddress: jsonb('shipping_address').$type<Record<string, unknown>>(),
    idempotencyKey: varchar('idempotency_key', { length: 120 }),
    mpPreferenceId: varchar('mp_preference_id', { length: 120 }),
    mpPaymentId: varchar('mp_payment_id', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_agent_carts_idempotency').on(table.idempotencyKey),
    index('idx_agent_carts_status_created').on(table.status, table.createdAt),
  ],
);

export const agentCartItems = pgTable(
  'agent_cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => agentCarts.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    title: varchar('title', { length: 150 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_agent_cart_items_cart').on(table.cartId),
    index('idx_agent_cart_items_seller').on(table.sellerId, table.createdAt),
  ],
);
