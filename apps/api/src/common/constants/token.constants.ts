export const TOKEN = {
  EXPIRY_DAYS: 365,
  LOW_BALANCE_THRESHOLD: 3,
  CONFIG_KEYS: {
    REWARD_REGISTRATION: 'tokens.reward.registration',
    REWARD_KYC_PHONE: 'tokens.reward.kyc.phone',
    REWARD_KYC_DNI: 'tokens.reward.kyc.dni',
    REWARD_KYC_ADDRESS: 'tokens.reward.kyc.address',
    REWARD_KYC_SELFIE: 'tokens.reward.kyc.selfie',
    REWARD_FIRST_SALE: 'tokens.reward.first_sale',
    REWARD_REFERRAL_SIGNUP: 'tokens.reward.referral.signup',
    REWARD_REVIEW_GIVEN: 'tokens.reward.review_given',
    QUOTA_MONTHLY: 'tokens.quota.monthly',
    QUOTA_ON_REGISTRATION: 'tokens.quota.on_registration',
  } as const,
} as const
