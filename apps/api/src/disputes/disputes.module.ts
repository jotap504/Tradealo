import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DisputesService } from './disputes.service';
import {
  DisputesController,
  AdminDisputesController,
} from './disputes.controller';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? 'changeme_dev_only',
    }),
    NotificationsModule,
    StorageModule,
  ],
  controllers: [DisputesController, AdminDisputesController],
  providers: [DisputesService, AdminJwtGuard],
})
export class DisputesModule {}
