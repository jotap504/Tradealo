import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    // bcrypt hash of the raw token. Raw token is shown to user only once at creation.
    tokenHash: varchar('token_hash', { length: 100 }).notNull(),
    // First few chars of the raw token (with trc_ prefix) for display in UI lists.
    tokenPrefix: varchar('token_prefix', { length: 16 }).notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastUsedIp: varchar('last_used_ip', { length: 45 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_api_tokens_hash').on(table.tokenHash),
    index('idx_api_tokens_user').on(table.userId, table.revokedAt),
  ],
);

export const agentActions = pgTable(
  'agent_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenId: uuid('token_id')
      .notNull()
      .references(() => apiTokens.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tool: varchar('tool', { length: 60 }).notNull(),
    inputSummary: text('input_summary'),
    affectedListingId: uuid('affected_listing_id'),
    status: varchar('status', { length: 20 }).notNull(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_agent_actions_user_created').on(table.userId, table.createdAt),
    index('idx_agent_actions_token').on(table.tokenId, table.createdAt),
  ],
);
