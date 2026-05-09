import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AdminSessionPayload } from '../../admin/admin-auth.service';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { adminUser?: AdminSessionPayload }>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('ADMIN_TOKEN_REQUIRED');

    let payload: AdminSessionPayload;
    try {
      payload = this.jwtService.verify<AdminSessionPayload>(token, {
        secret: process.env.ADMIN_JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('INVALID_ADMIN_TOKEN');
    }

    if (!payload.isAdminSession)
      throw new UnauthorizedException('INVALID_ADMIN_TOKEN');

    request.adminUser = payload;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7);
  }
}
