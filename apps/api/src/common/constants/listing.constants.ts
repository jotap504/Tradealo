export const LISTING = {
  MAX_IMAGES_STANDARD: 10,
  MAX_IMAGES_PREMIUM: 20,
  MIN_IMAGES: 1,
  DURATION_OPTIONS: [30, 60, 90] as const,
  DEFAULT_DURATION: 30,
  STATUS: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    SOLD: 'sold',
    EXPIRED: 'expired',
    REMOVED: 'removed',
  } as const,
  MODERATION: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    FLAGGED: 'flagged',
  } as const,
  RISK_SCORE: {
    AUTO_APPROVE_MAX: 39,
    MANUAL_REVIEW_MIN: 40,
    AUTO_REJECT_MIN: 80,
  } as const,
} as const
