import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReportsService } from './reports.service';
import {
  ReportsController,
  AdminReportsController,
} from './reports.controller';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? 'changeme_dev_only',
    }),
  ],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService, AdminJwtGuard],
})
export class ReportsModule {}
