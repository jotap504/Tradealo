export type ListingType = 'standard' | 'premium'

export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'expired' | 'removed'

export type ListingCondition = 'new' | 'used' | 'refurbished'

export type Currency = 'ARS' | 'USD'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'mercadopago' | 'uala' | 'other'

export type ShippingOption = 'pickup_only' | 'buyer_pays' | 'seller_pays' | 'to_be_agreed'

export interface ListingDto {
  id: string
  title: string
  price: string
  currency: Currency
  priceDisplay: string
  priceNegotiable: boolean
  condition: ListingCondition
  type: ListingType
  isCollectible: boolean
  primaryImage: string | null
  city: string | null
  province: string | null
  seller: {
    id: string
    username: string | null
    avatarUrl: string | null
    kycLevel: number
    reputationAvg: number
  }
  createdAt: string
  expiresAt: string | null
}

export interface ListingDetailDto extends ListingDto {
  description: string
  collectibleAttributes: Record<string, unknown> | null
  images: ListingImageDto[]
  paymentMethods: PaymentMethod[]
  shippingOptions: ShippingOption[]
  shippingDescription: string | null
  viewsCount: number
  contactsCount: number
  status: ListingStatus
  moderationStatus: string
  wasFreeQuota: boolean
  creditsSpent: number
  aiGenerated: boolean
  category: { id: string; name: string; slug: string }
}

export interface ListingImageDto {
  id: string
  url: string
  thumbnailUrl: string | null
  isPrimary: boolean
  sortOrder: number
}

export interface ListingFilters {
  q?: string
  categoryId?: string
  type?: ListingType
  condition?: ListingCondition
  minPrice?: number
  maxPrice?: number
  currency?: Currency
  province?: string
  city?: string
  lat?: number
  lng?: number
  radiusKm?: number
  isCollectible?: boolean
  sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'relevance'
  cursor?: string
  limit?: number
}
