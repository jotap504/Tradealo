import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { listings } from './listings.schema';

export const listingQuestions = pgTable(
  'listing_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    question: text('question').notNull(),
    answer: text('answer'),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
    isPrivate: boolean('is_private').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_listing_questions_listing').on(table.listingId, table.createdAt),
  ],
);
