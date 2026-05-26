import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SupportService } from './support.service';
import {
  SupportController,
  AdminSupportController,
} from './support.controller';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? 'changeme_dev_only',
    }),
    NotificationsModule,
  ],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, AdminJwtGuard],
})
export class SupportModule {}
