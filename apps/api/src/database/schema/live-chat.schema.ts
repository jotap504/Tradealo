import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { listings } from './listings.schema';
import { users } from './users.schema';

export const liveChatMessages = pgTable(
  'live_chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_live_chat_listing_created').on(table.listingId, table.createdAt),
  ],
);
