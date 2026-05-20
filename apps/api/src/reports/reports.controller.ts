import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsString,
  IsIn,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportsService } from './reports.service';
import { Public } from '../common/decorators/public.decorator';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import type { AdminSessionPayload } from '../admin/admin-auth.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class CreateReportDto {
  @IsIn(['listing', 'user'])
  targetType!: 'listing' | 'user';

  @IsUUID()
  targetId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

class AssignReportDto {
  @IsOptional()
  @IsUUID()
  adminId?: string;
}

class ResolveReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  resolution!: string;
}

class ListReportsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

// ─── User controller ───────────────────────────────────────────────────────────

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  createReport(@CurrentUser() user: JwtPayload, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(user.sub, dto);
  }
}

// ─── Admin controller ──────────────────────────────────────────────────────────

@Public()
@UseGuards(AdminJwtGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  listReports(@Query() query: ListReportsQueryDto) {
    return this.reportsService.listReports({
      status: query.status,
      targetType: query.targetType,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get(':id')
  getReport(@Param('id') id: string) {
    return this.reportsService.getReport(id);
  }

  @Patch(':id/assign')
  assignReport(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: AssignReportDto,
  ) {
    const adminId = dto.adminId ?? admin.sub;
    return this.reportsService.assignReport(id, adminId);
  }

  @Patch(':id/resolve')
  resolveReport(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolveReport(id, dto.resolution, admin.sub);
  }

  @Patch(':id/dismiss')
  dismissReport(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.dismissReport(id, dto.resolution, admin.sub);
  }
}
