import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import { AdminPreAuthGuard } from '../common/guards/admin-preauth.guard';
import { AdminConfigService } from '../config/admin-config.service';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET ?? 'changeme_admin_dev_only',
    }),
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [
    AdminService,
    AdminAuthService,
    AdminJwtGuard,
    AdminPreAuthGuard,
    AdminConfigService,
    ConfigService,
  ],
})
export class AdminModule {}
