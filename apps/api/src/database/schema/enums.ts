import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended',
  'banned',
  'deleted',
]);

export const userRoleEnum = pgEnum('user_role', [
  'user',
  'verified_user',
  'moderator',
  'support',
  'finance',
  'partner',
  'super_admin',
]);

export const kycTypeEnum = pgEnum('kyc_type', [
  'email',
  'phone',
  'dni',
  'address',
  'selfie',
  'phone_camera',
  'bcra_consent',
  'company_statute',
  'arca_registration',
  'google_maps',
]);

export const kycStatusEnum = pgEnum('kyc_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);

export const listingTypeEnum = pgEnum('listing_type', ['standard', 'premium']);

export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'active',
  'paused',
  'sold',
  'expired',
  'removed',
]);

export const listingConditionEnum = pgEnum('listing_condition', [
  'new',
  'used',
  'refurbished',
]);

export const currencyEnum = pgEnum('currency', ['ARS', 'USD']);

export const creditReasonEnum = pgEnum('credit_reason', [
  'registration_bonus',
  'profile_complete',
  'kyc_phone',
  'kyc_dni',
  'kyc_address',
  'kyc_selfie',
  'first_sale',
  'referral_signup',
  'referral_first_sale',
  'review_given',
  'monthly_quota',
  'token_purchase',
  'listing_publish',
  'listing_feature',
  'listing_renewal',
  'ai_generation',
  'refund',
  'admin_adjustment',
  'token_expired',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'push',
  'in_app',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
  'read',
]);

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending',
  'approved',
  'rejected',
  'flagged',
]);

export const configDataTypeEnum = pgEnum('config_data_type', [
  'integer',
  'decimal',
  'boolean',
  'string',
  'json',
  'select',
  'multi_select',
]);

export const conversationStatusEnum = pgEnum('conversation_status', [
  'active',
  'archived',
  'blocked',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'delivered',
  'completed',
  'cancelled',
]);
