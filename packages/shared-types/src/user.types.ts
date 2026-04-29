export type UserRole =
  | 'user'
  | 'verified_user'
  | 'moderator'
  | 'support'
  | 'finance'
  | 'partner'
  | 'super_admin'

export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted'

export type KycType = 'email' | 'phone' | 'dni' | 'address' | 'selfie'

export type KycStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface UserSummaryDto {
  id: string
  email: string
  role: UserRole
  kycLevel: number
  wallet: { balance: number }
}

export interface UserProfileDto {
  username: string | null
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  bio: string | null
  whatsapp: string | null
  showPhone: boolean
  province: string | null
  city: string | null
  completenessPct: number
}

export interface PublicSellerDto {
  id: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  province: string | null
  city: string | null
  memberSince: string
  kycLevel: number
  reputation: {
    asSellerAvg: number
    asSellerCount: number
  }
  whatsapp?: string
}
