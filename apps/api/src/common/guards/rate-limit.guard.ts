import {
  Injectable, CanActivate, ExecutionContext, Inject, HttpException, HttpStatus,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import type Redis from 'ioredis'
import { REDIS_TOKEN } from '../../redis/redis.module'
import { RATE_LIMIT_META, type RateLimitOptions } from '../decorators/rate-limit.decorator'
import type { JwtPayload } from '../decorators/current-user.decorator'

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_META, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!options) return true

    const { ttl, limit, keyBy = 'ip' } = options
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>()

    const keyPart = keyBy === 'user' && request.user?.sub
      ? `u:${request.user.sub}`
      : `ip:${request.ip ?? 'unknown'}`

    const key = `rl:${context.getHandler().name}:${keyPart}`
    const count = await this.redis.incr(key)

    if (count === 1) {
      await this.redis.expire(key, ttl)
    }

    if (count > limit) {
      throw new HttpException('RATE_LIMIT_EXCEEDED', HttpStatus.TOO_MANY_REQUESTS)
    }

    return true
  }
}
