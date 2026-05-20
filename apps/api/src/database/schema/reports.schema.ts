import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id),
    targetType: varchar('target_type', { length: 20 }).notNull(), // 'listing' | 'user'
    targetId: uuid('target_id').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('open'), // 'open' | 'resolved' | 'dismissed'
    assignedTo: uuid('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolution: text('resolution'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_reports_reporter').on(table.reporterId, table.createdAt),
    index('idx_reports_target').on(table.targetType, table.targetId),
    index('idx_reports_status').on(table.status, table.createdAt),
    index('idx_reports_assigned').on(table.assignedTo),
  ],
);
