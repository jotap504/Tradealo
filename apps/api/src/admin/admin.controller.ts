import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsIn } from 'class-validator';
import { AdminService } from './admin.service';
import { Public } from '../common/decorators/public.decorator';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import type { AdminSessionPayload } from './admin-auth.service';

class UpdateRoleDto {
  @IsString()
  @IsIn([
    'user',
    'verified_user',
    'moderator',
    'support',
    'finance',
    'partner',
    'super_admin',
  ])
  role!: string;
}

@Controller('admin')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  listUsers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminService.listUsers(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
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

  @Get('listings/flagged')
  listFlagged(@Query('limit') limit?: string) {
    return this.adminService.listFlaggedListings(
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
