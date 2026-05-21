import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { sellerShops } from './shop.schema';
import { shopSubscriptionStatusEnum } from './enums';

export const shopSubscriptions = pgTable(
  'shop_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => sellerShops.id, { onDelete: 'cascade' }),
    status: shopSubscriptionStatusEnum('status').notNull().default('trial'),
    mpSubscriptionId: varchar('mp_subscription_id', { length: 100 }),
    mpPreapprovalPlanId: varchar('mp_preapproval_plan_id', { length: 100 }),
    billingCycleStart: timestamp('billing_cycle_start', { withTimezone: true }),
    billingCycleEnd: timestamp('billing_cycle_end', { withTimezone: true }),
    nextBillingDate: timestamp('next_billing_date', { withTimezone: true }),
    amountArs: decimal('amount_ars', { precision: 10, scale: 2 }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_shop_subs_user').on(table.userId),
    index('idx_shop_subs_mp').on(table.mpSubscriptionId),
    index('idx_shop_subs_status').on(table.status),
  ],
);
