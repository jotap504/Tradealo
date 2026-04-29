import { z } from 'zod'

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'mercadopago', 'uala', 'other'] as const
const SHIPPING_OPTIONS = ['pickup_only', 'buyer_pays', 'seller_pays', 'to_be_agreed'] as const
const DURATION_DAYS = [30, 60, 90] as const

export const createListingSchema = z.object({
  title: z.string().min(10).max(150),
  description: z.string().min(20).max(5000),
  categoryId: z.string().uuid(),
  type: z.enum(['standard', 'premium']),
  isCollectible: z.boolean().default(false),
  condition: z.enum(['new', 'used', 'refurbished']),
  price: z.number().positive(),
  currency: z.enum(['ARS', 'USD']),
  priceNegotiable: z.boolean().default(false),
  province: z.string().max(50),
  city: z.string().max(100),
  lat: z.number().optional(),
  lng: z.number().optional(),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).min(1),
  shippingOptions: z.array(z.enum(SHIPPING_OPTIONS)).min(1),
  shippingDescription: z.string().max(500).optional(),
  durationDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
  aiGenerated: z.boolean().default(false),
  collectibleAttributes: z.record(z.unknown()).nullable().default(null),
})

export const listingFiltersSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['standard', 'premium']).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  currency: z.enum(['ARS', 'USD']).optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().max(200).default(25).optional(),
  isCollectible: z.boolean().optional(),
  sortBy: z.enum(['recent', 'price_asc', 'price_desc', 'relevance']).default('recent').optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20).optional(),
})

export type CreateListingInput = z.infer<typeof createListingSchema>
export type ListingFiltersInput = z.infer<typeof listingFiltersSchema>
