import {
  pgTable,
  uuid,
  varchar,
  customType,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

export const sellerPaymentCredentials = pgTable(
  'seller_payment_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 })
      .notNull()
      .default('mercadopago'),
    mpUserId: varchar('mp_user_id', { length: 40 }),
    // AES-256-GCM components for the access token
    accessTokenCiphertext: bytea('access_token_ciphertext').notNull(),
    accessTokenIv: bytea('access_token_iv').notNull(),
    accessTokenAuthTag: bytea('access_token_auth_tag').notNull(),
    refreshTokenCiphertext: bytea('refresh_token_ciphertext'),
    refreshTokenIv: bytea('refresh_token_iv'),
    refreshTokenAuthTag: bytea('refresh_token_auth_tag'),
    tokenKind: varchar('token_kind', { length: 20 }).notNull().default('manual'),
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
  (table) => [index('idx_seller_payment_credentials_user').on(table.userId)],
);
