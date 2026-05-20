import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AdminSessionPayload } from '../../admin/admin-auth.service';

const ADMIN_ROLES = ['super_admin', 'partner', 'finance', 'support', 'moderator'];

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { adminUser?: AdminSessionPayload }>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('ADMIN_TOKEN_REQUIRED');

    // Try dedicated admin token first (adminUsers table + TOTP flow)
    try {
      const payload = this.jwtService.verify<AdminSessionPayload>(token, {
        secret: process.env.ADMIN_JWT_SECRET,
      });
      if (payload.isAdminSession) {
        request.adminUser = payload;
        return true;
      }
    } catch { /* fall through to regular user token check */ }

    // Accept regular user access tokens for users with admin roles
    try {
      const userPayload = this.jwtService.verify<{
        sub: string; email: string; role: string;
      }>(token, { secret: process.env.JWT_ACCESS_SECRET ?? 'changeme_dev_only' });

      if (!ADMIN_ROLES.includes(userPayload.role)) {
        throw new UnauthorizedException('INSUFFICIENT_ROLE');
      }

      request.adminUser = {
        sub: userPayload.sub,
        email: userPayload.email,
        role: userPayload.role,
        isAdminSession: true,
      };
      return true;
    } catch (err) {
      if ((err as { status?: number }).status === 401) throw err;
      throw new UnauthorizedException('INVALID_ADMIN_TOKEN');
    }
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7);
  }
}
