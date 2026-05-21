import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sellerShops } from './shop.schema';

export const shopAnalyticsEvents = pgTable(
  'shop_analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => sellerShops.id, { onDelete: 'cascade' }),
    // page_view | listing_click | whatsapp_click | chatbot_session
    eventType: varchar('event_type', { length: 50 }).notNull(),
    visitorHash: varchar('visitor_hash', { length: 64 }),
    listingId: uuid('listing_id'),
    sessionId: varchar('session_id', { length: 36 }),
    referrer: varchar('referrer', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_shop_events_shop_time').on(table.shopId, table.createdAt),
    index('idx_shop_events_type').on(
      table.shopId,
      table.eventType,
      table.createdAt,
    ),
  ],
);
