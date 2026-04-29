import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { KYC_LEVEL_KEY } from '../decorators/require-kyc-level.decorator'
import type { JwtPayload } from '../decorators/current-user.decorator'

@Injectable()
export class KycLevelGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<number>(KYC_LEVEL_KEY, context.getHandler())
    if (required === undefined) return true

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>()
    const user = request.user

    if (user.kycLevel < required) {
      throw new ForbiddenException('KYC_LEVEL_REQUIRED')
    }
    return true
  }
}
