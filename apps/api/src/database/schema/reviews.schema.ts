import {
  pgTable, uuid, smallint, text, boolean,
  decimal, timestamp, index, uniqueIndex, varchar, integer,
} from 'drizzle-orm/pg-core'
import { users } from './users.schema'
import { listings } from './listings.schema'

export const reviews = pgTable('reviews', {
  id:            uuid('id').primaryKey().defaultRandom(),
  listingId:     uuid('listing_id').notNull().references(() => listings.id),
  reviewerId:    uuid('reviewer_id').notNull().references(() => users.id),
  reviewedId:    uuid('reviewed_id').notNull().references(() => users.id),
  direction:     varchar('direction', { length: 20 }).notNull(),
  overallRating: smallint('overall_rating').notNull(),
  comment:       text('comment'),
  isPublic:      boolean('is_public').notNull().default(true),
  replyText:     text('reply_text'),
  replyCreatedAt: timestamp('reply_created_at', { withTimezone: true }),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_reviews_unique').on(table.listingId, table.reviewerId, table.direction),
  index('idx_reviews_reviewed').on(table.reviewedId, table.createdAt),
])

export const reputationScores = pgTable('reputation_scores', {
  userId:        uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  asSellerAvg:   decimal('as_seller_avg', { precision: 3, scale: 2 }).default('0'),
  asSellerCount: integer('as_seller_count').notNull().default(0),
  asBuyerAvg:    decimal('as_buyer_avg', { precision: 3, scale: 2 }).default('0'),
  asBuyerCount:  integer('as_buyer_count').notNull().default(0),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
