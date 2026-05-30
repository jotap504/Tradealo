import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiTokensService } from './api-tokens.service';
import { ShopSubscriptionService } from '../shop-subscription/shop-subscription.service';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

class CreateTokenDto {
  @IsString() @MaxLength(80) name!: string;
  @IsOptional() @IsArray() scopes?: string[];
}

@Controller('me/api-tokens')
export class ApiTokensController {
  constructor(
    private readonly service: ApiTokensService,
    private readonly subscriptionService: ShopSubscriptionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTokenDto,
  ) {
    await this.ensureActiveShopSubscription(user.sub);
    return this.service.create(user.sub, dto.name, dto.scopes ?? []);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.service.listForUser(user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async revoke(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.revoke(user.sub, id);
  }

  private async ensureActiveShopSubscription(userId: string) {
    const sub = await this.subscriptionService.getStatus(userId);
    if (!sub || sub.status !== 'active') {
      throw new ForbiddenException(
        'API tokens are available for users with an active Shop subscription',
      );
    }
  }
}
