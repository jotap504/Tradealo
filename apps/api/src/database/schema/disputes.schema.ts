import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { listings } from './listings.schema';
import { adminUsers } from './config.schema';

export const disputes = pgTable(
  'disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    initiatorId: uuid('initiator_id')
      .notNull()
      .references(() => users.id),
    respondentId: uuid('respondent_id')
      .notNull()
      .references(() => users.id),
    listingId: uuid('listing_id').references(() => listings.id),
    subject: varchar('subject', { length: 200 }).notNull(),
    description: text('description').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('open'), // 'open' | 'resolved' | 'closed'
    assignedTo: uuid('assigned_to').references(() => adminUsers.id),
    resolution: text('resolution'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_disputes_initiator').on(table.initiatorId, table.createdAt),
    index('idx_disputes_respondent').on(table.respondentId, table.createdAt),
    index('idx_disputes_status').on(table.status, table.createdAt),
    index('idx_disputes_assigned').on(table.assignedTo),
  ],
);

export const disputeMessages = pgTable(
  'dispute_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disputeId: uuid('dispute_id')
      .notNull()
      .references(() => disputes.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull(),
    authorType: varchar('author_type', { length: 10 }).notNull(), // 'user' | 'admin'
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_dispute_messages_dispute').on(table.disputeId, table.createdAt),
  ],
);
