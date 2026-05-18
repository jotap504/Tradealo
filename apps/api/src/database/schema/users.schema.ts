import {
  pgTable, uuid, varchar, boolean, smallint,
  timestamp, char, text, index, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { userStatusEnum, userRoleEnum, kycTypeEnum, kycStatusEnum } from './enums'

export const users = pgTable('users', {
  id:               uuid('id').primaryKey().defaultRandom(),
  email:            varchar('email', { length: 255 }).notNull().unique(),
  phone:            varchar('phone', { length: 20 }).unique(),
  passwordHash:     varchar('password_hash', { length: 255 }).notNull(),
  role:             userRoleEnum('role').notNull().default('user'),
  status:           userStatusEnum('status').notNull().default('active'),
  kycLevel:         smallint('kyc_level').notNull().default(0),
  countryCode:      char('country_code', { length: 2 }).notNull().default('AR'),
  emailVerified:    boolean('email_verified').notNull().default(false),
  phoneVerified:    boolean('phone_verified').notNull().default(false),
  twoFactorSecret:  varchar('two_factor_secret', { length: 64 }),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  referralCode:     varchar('referral_code', { length: 12 }).unique(),
  referredBy:       uuid('referred_by').references((): any => users.id),
  lastLoginAt:      timestamp('last_login_at', { withTimezone: true }),
  deletedAt:        timestamp('deleted_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_users_email').on(table.email),
  uniqueIndex('idx_users_phone').on(table.phone),
  uniqueIndex('idx_users_referral_code').on(table.referralCode),
  index('idx_users_status').on(table.status),
])

export const userProfiles = pgTable('user_profiles', {
  userId:             uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  username:           varchar('username', { length: 30 }).unique(),
  firstName:          varchar('first_name', { length: 100 }),
  lastName:           varchar('last_name', { length: 100 }),
  avatarUrl:          varchar('avatar_url', { length: 500 }),
  bio:                text('bio'),
  whatsapp:           varchar('whatsapp', { length: 20 }),
  showPhone:          boolean('show_phone').notNull().default(false),
  province:           varchar('province', { length: 50 }),
  city:               varchar('city', { length: 100 }),
  cbu:                varchar('cbu', { length: 22 }),
  alias:              varchar('alias', { length: 50 }),
  bankName:           varchar('bank_name', { length: 100 }),
  bankAccountType:    varchar('bank_account_type', { length: 30 }),
  bankAccountNumber:  varchar('bank_account_number', { length: 30 }),
  completenessPct:    smallint('completeness_pct').notNull().default(0),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userVerifications = pgTable('user_verifications', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  userId:             uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:               kycTypeEnum('type').notNull(),
  status:             kycStatusEnum('status').notNull().default('pending'),
  s3Key:              varchar('s3_key', { length: 500 }),
  verificationData:   varchar('verification_data', { length: 500 }),
  rejectionReason:    text('rejection_reason'),
  verifiedAt:         timestamp('verified_at', { withTimezone: true }),
  verifiedBy:         uuid('verified_by'),
  expiresAt:          timestamp('expires_at', { withTimezone: true }),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_verifications_user_type').on(table.userId, table.type),
])

export const refreshTokens = pgTable('refresh_tokens', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash:   varchar('token_hash', { length: 255 }).notNull().unique(),
  deviceId:    varchar('device_id', { length: 100 }),
  deviceInfo:  varchar('device_info', { length: 255 }),
  ipAddress:   varchar('ip_address', { length: 45 }),
  revokedAt:   timestamp('revoked_at', { withTimezone: true }),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_refresh_tokens_user').on(table.userId),
  uniqueIndex('idx_refresh_tokens_hash').on(table.tokenHash),
])
