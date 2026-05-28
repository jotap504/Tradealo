import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';
import type { Request } from 'express';
import type { AdminSessionPayload } from '../../admin/admin-auth.service';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { adminUser?: AdminSessionPayload }>();

    const adminRole = request.adminUser?.role;
    if (!adminRole || !requiredRoles.includes(adminRole)) {
      throw new ForbiddenException('INSUFFICIENT_ADMIN_ROLE');
    }

    return true;
  }
}
