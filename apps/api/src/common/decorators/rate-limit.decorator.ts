import { SetMetadata } from '@nestjs/common'

export interface RateLimitOptions {
  ttl: number
  limit: number
  keyBy?: 'ip' | 'user'
}

export const RATE_LIMIT_META = 'rl_options'
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_META, options)
