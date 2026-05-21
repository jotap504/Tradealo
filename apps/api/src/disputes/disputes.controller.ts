import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DisputesService } from './disputes.service';
import { Public } from '../common/decorators/public.decorator';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import type { AdminSessionPayload } from '../admin/admin-auth.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class CreateDisputeDto {
  @IsUUID()
  respondentId!: string;

  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;
}

class AddMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

class UploadImageDto {
  @IsString()
  @IsNotEmpty()
  data!: string;

  @IsString()
  @IsNotEmpty()
  mimetype!: string;
}

class ResolveDisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  resolution!: string;
}

class ListAdminDisputesQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

// ─── User controller ───────────────────────────────────────────────────────────

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  createDispute(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.createDispute(user.sub, {
      respondentId: dto.respondentId,
      listingId: dto.listingId,
      subject: dto.subject,
      description: dto.description,
    });
  }

  @Get('me')
  listUserDisputes(@CurrentUser() user: JwtPayload) {
    return this.disputesService.listUserDisputes(user.sub);
  }

  @Get(':id')
  getDispute(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.disputesService.getDispute(id, user.sub);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddMessageDto,
  ) {
    return this.disputesService.addMessage(
      id,
      user.sub,
      'user',
      dto.message,
      dto.imageUrl,
    );
  }

  @Post(':id/image')
  @HttpCode(HttpStatus.OK)
  uploadImage(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadImageDto,
  ) {
    return this.disputesService
      .uploadDisputeImage(id, user.sub, dto.data, dto.mimetype)
      .then((imageUrl) => ({ imageUrl }));
  }

  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  closeDispute(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.disputesService.closeDisputeByUser(id, user.sub);
  }
}

// ─── Admin controller ──────────────────────────────────────────────────────────

@Public()
@UseGuards(AdminJwtGuard)
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  listAdminDisputes(@Query() query: ListAdminDisputesQueryDto) {
    return this.disputesService.listAdminDisputes({
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get(':id')
  getDispute(@Param('id') id: string) {
    return this.disputesService.getDispute(id);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: AddMessageDto,
  ) {
    return this.disputesService.addMessage(id, admin.sub, 'admin', dto.message);
  }

  @Patch(':id/assign')
  assignDispute(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
  ) {
    return this.disputesService.assignDispute(id, admin.sub);
  }

  @Patch(':id/resolve')
  resolveDispute(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(id, dto.resolution, admin.sub);
  }

  @Patch(':id/close')
  closeDispute(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminSessionPayload,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.closeDispute(id, dto.resolution, admin.sub);
  }
}
