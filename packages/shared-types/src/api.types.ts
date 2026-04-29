export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ApiListResponse<T> {
  success: true
  data: T[]
  meta: {
    nextCursor: string | null
    hasMore: boolean
    total?: number
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    statusCode: number
    timestamp: string
    path: string
  }
}

export type ApiErrorCode =
  | 'USER_NOT_FOUND'
  | 'LISTING_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'KYC_LEVEL_REQUIRED'
  | 'INSUFFICIENT_TOKENS'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_EMAIL'
  | 'INVALID_DNI'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PAYMENT_FAILED'
  | 'WEBHOOK_INVALID'
  | 'CONFIG_NOT_FOUND'
  | 'AI_UNAVAILABLE'
  | 'AI_RATE_LIMIT'
