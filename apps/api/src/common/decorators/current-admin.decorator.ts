import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type {
  AdminSessionPayload,
  AdminPreAuthPayload,
} from '../../admin/admin-auth.service';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminSessionPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { adminUser?: AdminSessionPayload }>();
    return request.adminUser!;
  },
);

export const CurrentAdminPreAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminPreAuthPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { adminPreAuth?: AdminPreAuthPayload }>();
    return request.adminPreAuth!;
  },
);
