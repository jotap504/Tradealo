import { pgTable, uuid, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { orderStatusEnum } from './enums';
import { users } from './users.schema';
import { listings, listingVariants } from './listings.schema';
import { conversations } from './messages.schema';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id),
    variantId: uuid('variant_id').references(() => listingVariants.id, {
      onDelete: 'set null',
    }),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id),
    status: orderStatusEnum('status').notNull().default('pending'),
    paymentInfo: jsonb('payment_info'),

    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_orders_buyer').on(table.buyerId, table.createdAt),
    index('idx_orders_seller').on(table.sellerId, table.createdAt),
    index('idx_orders_conversation').on(table.conversationId),
    index('idx_orders_listing_status').on(table.listingId, table.status),
  ],
);
