import {
  pgTable, uuid, varchar, text, boolean, jsonb, timestamp, index,
} from 'drizzle-orm/pg-core'
import { notificationChannelEnum, notificationStatusEnum } from './enums'
import { users } from './users.schema'
import { listings } from './listings.schema'

export const notifications = pgTable('notifications', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel:   notificationChannelEnum('channel').notNull(),
  type:      varchar('type', { length: 100 }).notNull(),
  title:     varchar('title', { length: 200 }).notNull(),
  body:      text('body').notNull(),
  data:      jsonb('data'),
  status:    notificationStatusEnum('status').notNull().default('pending'),
  readAt:    timestamp('read_at', { withTimezone: true }),
  sentAt:    timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_notifications_user_unread').on(table.userId, table.readAt),
  index('idx_notifications_status').on(table.status, table.createdAt),
])

export const contactInquiries = pgTable('contact_inquiries', {
  id:           uuid('id').primaryKey().defaultRandom(),
  listingId:    uuid('listing_id').notNull().references(() => listings.id),
  senderUserId: uuid('sender_user_id').references(() => users.id),
  senderName:   varchar('sender_name', { length: 100 }),
  senderEmail:  varchar('sender_email', { length: 255 }),
  message:      text('message').notNull(),
  emailSent:    boolean('email_sent').notNull().default(false),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
