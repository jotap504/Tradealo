import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  IsString,
  IsIn,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { SupportService } from './support.service'
import { Public } from '../common/decorators/public.decorator'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator'
import { CurrentAdmin } from '../common/decorators/current-admin.decorator'
import type { AdminSessionPayload } from '../admin/admin-auth.service'

// ─── DTOs ─────────────────────────────────────────────────────────────────────

const CATEGORIES = ['account', 'billing', 'listing', 'technical', 'other'] as const
const STATUSES = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as const
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string

  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number]

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string
}

class AddMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string
}

class UpdateTicketDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number]

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number]

  @IsOptional()
  @IsUUID()
  assignedTo?: string
}

class ListAdminTicketsQueryDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number]

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number]

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsUUID()
  assignedTo?: string

  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @Type(() => Number)
  limit?: number
}

// ─── User controller ───────────────────────────────────────────────────────────

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  createTicket(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(user.sub, dto)
  }

  @Get('tickets')
  listUserTickets(@CurrentUser() user: JwtPayload) {
    return this.supportService.listUserTickets(user.sub)
  }

  @Get('tickets/me')
  listUserTicketsAlias(@CurrentUser() user: JwtPayload) {
    return this.supportService.listUserTickets(user.sub)
  }

  @Get('tickets/:id')
  getTicket(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.supportService.getTicket(id, user.sub)
  }

  @Post('tickets/:id/messages')
  addMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') ticketId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage(ticketId, user.sub, 'user', dto.message)
  }
}

// ─── Admin controller ──────────────────────────────────────────────────────────

@Public()
@UseGuards(AdminJwtGuard)
@Controller('admin/tickets')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  listAdminTickets(@Query() query: ListAdminTicketsQueryDto) {
    return this.supportService.listAdminTickets({
      status: query.status,
      priority: query.priority,
      category: query.category,
      assignedTo: query.assignedTo,
      cursor: query.cursor,
      limit: query.limit,
    })
  }

  @Get(':id')
  getTicket(@Param('id') id: string) {
    return this.supportService.getTicket(id)
  }

  @Post(':id/messages')
  addMessage(
    @CurrentAdmin() admin: AdminSessionPayload,
    @Param('id') ticketId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage(ticketId, admin.sub, 'admin', dto.message)
  }

  @Patch(':id')
  updateTicket(
    @CurrentAdmin() admin: AdminSessionPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.supportService.updateTicket(id, dto, admin.sub)
  }
}
