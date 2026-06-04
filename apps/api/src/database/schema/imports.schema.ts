import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { listings } from './listings.schema';

export const importJobs = pgTable(
  'import_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('queued'),
    totalItems: integer('total_items').notNull().default(0),
    succeeded: integer('succeeded').notNull().default(0),
    failed: integer('failed').notNull().default(0),
    skippedDuplicate: integer('skipped_duplicate').notNull().default(0),
    options: jsonb('options').notNull().default({}),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_import_jobs_user_created').on(table.userId, table.createdAt),
  ],
);

export const importJobItems = pgTable(
  'import_job_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => importJobs.id, { onDelete: 'cascade' }),
    externalProductId: varchar('external_product_id', { length: 60 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    listingId: uuid('listing_id').references(() => listings.id, {
      onDelete: 'set null',
    }),
    errorMessage: text('error_message'),
    rawPayload: jsonb('raw_payload'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_import_job_items_job').on(table.jobId, table.status)],
);
