import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AdminPreAuthPayload } from '../../admin/admin-auth.service';

@Injectable()
export class AdminPreAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { adminPreAuth?: AdminPreAuthPayload }>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('PRE_AUTH_TOKEN_REQUIRED');

    let payload: AdminPreAuthPayload;
    try {
      payload = this.jwtService.verify<AdminPreAuthPayload>(token, {
        secret: process.env.ADMIN_JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('INVALID_PRE_AUTH_TOKEN');
    }

    if (!payload.preAuth)
      throw new UnauthorizedException('INVALID_PRE_AUTH_TOKEN');

    request.adminPreAuth = payload;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7);
  }
}
