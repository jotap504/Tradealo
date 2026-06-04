import {
  pgTable,
  uuid,
  varchar,
  customType,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const sellerMarketplaceConnections = pgTable(
  'seller_marketplace_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull(),
    externalUserId: varchar('external_user_id', { length: 40 }),
    externalNickname: varchar('external_nickname', { length: 80 }),
    siteId: varchar('site_id', { length: 10 }),
    accessTokenCiphertext: bytea('access_token_ciphertext').notNull(),
    accessTokenIv: bytea('access_token_iv').notNull(),
    accessTokenAuthTag: bytea('access_token_auth_tag').notNull(),
    refreshTokenCiphertext: bytea('refresh_token_ciphertext'),
    refreshTokenIv: bytea('refresh_token_iv'),
    refreshTokenAuthTag: bytea('refresh_token_auth_tag'),
    scope: varchar('scope', { length: 200 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_marketplace_conn_user_provider').on(
      table.userId,
      table.provider,
    ),
  ],
);
