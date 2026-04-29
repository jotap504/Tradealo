export type CreditReason =
  | 'registration_bonus'
  | 'profile_complete'
  | 'kyc_phone'
  | 'kyc_dni'
  | 'kyc_address'
  | 'kyc_selfie'
  | 'first_sale'
  | 'referral_signup'
  | 'referral_first_sale'
  | 'review_given'
  | 'monthly_quota'
  | 'token_purchase'
  | 'listing_publish'
  | 'listing_feature'
  | 'listing_renewal'
  | 'ai_generation'
  | 'refund'
  | 'admin_adjustment'
  | 'token_expired'

export interface WalletDto {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  monthlyFreeQuota: {
    quota: number
    used: number
    remaining: number
  }
  expiringTokens: {
    amount: number
    expiresAt: string
  } | null
}

export interface CreditTransactionDto {
  id: string
  amount: number
  balanceAfter: number
  reason: CreditReason
  referenceId: string | null
  referenceType: string | null
  createdAt: string
}

export interface TokenPackDto {
  id: string
  key: string
  label: string
  tokens: number
  bonusPct: number
  tokensTotal: number
  isFeatured: boolean
  price: {
    amount: string
    currency: string
    display: string
  }
  activePromotion: string | null
}
