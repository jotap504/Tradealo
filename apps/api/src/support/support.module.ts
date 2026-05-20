import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SupportService } from './support.service';
import {
  SupportController,
  AdminSupportController,
} from './support.controller';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? 'changeme_dev_only',
    }),
  ],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, AdminJwtGuard],
})
export class SupportModule {}
