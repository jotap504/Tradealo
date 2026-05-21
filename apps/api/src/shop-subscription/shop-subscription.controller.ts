import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShopSubscriptionService } from './shop-subscription.service';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

@Controller('shop-subscriptions')
export class ShopSubscriptionController {
  constructor(private readonly service: ShopSubscriptionService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  subscribe(@CurrentUser() user: JwtPayload) {
    return this.service.subscribe(user.sub, user.email ?? '');
  }

  @Get('me')
  getStatus(@CurrentUser() user: JwtPayload) {
    return this.service.getStatus(user.sub);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: JwtPayload) {
    return this.service.cancel(user.sub);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('x-signature-ts') ts?: string,
  ) {
    return this.service.handleWebhook(body, signature, requestId, ts);
  }
}
