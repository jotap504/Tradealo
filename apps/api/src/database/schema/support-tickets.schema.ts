import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    subject: varchar('subject', { length: 200 }).notNull(),
    category: varchar('category', { length: 30 }).notNull(), // 'account'|'billing'|'listing'|'technical'|'other'
    priority: varchar('priority', { length: 10 }).notNull().default('medium'), // 'low'|'medium'|'high'|'urgent'
    status: varchar('status', { length: 20 }).notNull().default('open'), // 'open'|'in_progress'|'waiting_user'|'resolved'|'closed'
    assignedTo: uuid('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_support_tickets_user').on(table.userId, table.updatedAt),
    index('idx_support_tickets_status').on(table.status, table.updatedAt),
    index('idx_support_tickets_assigned').on(table.assignedTo),
    index('idx_support_tickets_category').on(table.category),
    index('idx_support_tickets_priority').on(table.priority),
  ],
);

export const ticketMessages = pgTable(
  'ticket_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull(),
    authorType: varchar('author_type', { length: 10 }).notNull(), // 'user'|'admin'
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_ticket_messages_ticket').on(table.ticketId, table.createdAt),
  ],
);
