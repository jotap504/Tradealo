import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  IsString,
  IsIn,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdminService } from './admin.service';
import { Public } from '../common/decorators/public.decorator';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import type { AdminSessionPayload } from './admin-auth.service';

class UpdateRoleDto {
  @IsString()
  @IsIn(['user', 'verified_user', 'moderator', 'support', 'finance', 'partner', 'super_admin'])
  role!: string;
}

class AdjustTokensDto {
  @IsNumber()
  @IsInt()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string;
}

class UpdateConfigDto {
  value!: unknown;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

class RejectReasonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

class UpdateTokenPackDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  tokens?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bonusPct?: number;

  @IsOptional()
  isFeatured?: boolean;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

class UpdateTokenPackPriceDto {
  @IsString()
  @IsNotEmpty()
  price!: string;
}

@Controller('admin')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard / Stats ───────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @Query('cursor') cursor?: string,
    @Query('role') role?: string,
    @Query('kycLevel') kycLevel?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers({
      cursor,
      role,
      kycLevel: kycLevel !== undefined ? parseInt(kycLevel, 10) : undefined,
      status,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  updateRole(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto.role, admin.sub);
  }

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  suspendUser(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
  ) {
    return this.adminService.suspendUser(id, admin.sub);
  }

  @Patch('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  banUser(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
  ) {
    return this.adminService.banUser(id, admin.sub);
  }

  @Post('users/:id/tokens')
  @HttpCode(HttpStatus.OK)
  adjustTokens(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: AdjustTokensDto,
  ) {
    return this.adminService.adjustTokens(id, dto.amount, dto.reason, admin.sub);
  }

  // ─── Configs ─────────────────────────────────────────────────────────────────

  @Get('configs')
  getConfigs() {
    return this.adminService.getConfigs();
  }

  @Patch('configs/:key')
  @HttpCode(HttpStatus.OK)
  updateConfig(
    @Param('key') key: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.adminService.updateConfig(key, dto.value, dto.reason, admin.sub);
  }

  // ─── Token Packs ─────────────────────────────────────────────────────────────

  @Get('token-packs')
  getTokenPacks() {
    return this.adminService.getTokenPacks();
  }

  @Patch('token-packs/:id')
  @HttpCode(HttpStatus.OK)
  updateTokenPack(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: UpdateTokenPackDto,
  ) {
    return this.adminService.updateTokenPack(id, dto, admin.sub);
  }

  @Patch('token-packs/prices/:priceId')
  @HttpCode(HttpStatus.OK)
  updateTokenPackPrice(
    @Param('priceId') priceId: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: UpdateTokenPackPriceDto,
  ) {
    return this.adminService.updateTokenPackPrice(priceId, dto.price, admin.sub);
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────────

  @Get('kyc/pending')
  listKycPending(@Query('type') type?: string) {
    return this.adminService.listKycPending(type);
  }

  @Post('kyc/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveKyc(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
  ) {
    return this.adminService.approveKyc(id, admin.sub);
  }

  @Post('kyc/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectKyc(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: RejectReasonDto,
  ) {
    return this.adminService.rejectKyc(id, dto.reason, admin.sub);
  }

  // ─── Listings ────────────────────────────────────────────────────────────────

  @Get('listings/flagged')
  listFlagged(@Query('limit') limit?: string) {
    return this.adminService.listFlaggedListings(limit ? parseInt(limit, 10) : 50);
  }

  @Get('listings/pending')
  listModerationListings(@Query('cursor') cursor?: string) {
    return this.adminService.listModerationListings(cursor);
  }

  @Post('listings/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveListing(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
  ) {
    return this.adminService.approveListing(id, admin.sub);
  }

  @Post('listings/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectListing(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: RejectReasonDto,
  ) {
    return this.adminService.rejectListing(id, dto.reason, admin.sub);
  }

  // ─── Audit Log ───────────────────────────────────────────────────────────────

  @Get('audit-log')
  getAuditLog(
    @Query('entityType') entityType?: string,
    @Query('adminId') adminId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLog({
      entityType,
      adminId,
      from,
      to,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
