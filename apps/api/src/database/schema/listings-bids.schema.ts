import { pgTable, uuid, integer, text, timestamp } from 'drizzle-orm/pg-core'
import { listings } from './listings.schema'
import { users } from './users.schema'

export const listingBids = pgTable('listing_bids', {
  id:        uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  bidderId:  uuid('bidder_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount:    integer('amount').notNull(),
  status:    text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
