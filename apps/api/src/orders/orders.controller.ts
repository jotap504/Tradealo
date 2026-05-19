import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findMine(user.sub);
  }

  @Get('my-purchases')
  findMyPurchases(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findMyPurchases(user.sub);
  }

  @Get('my-sales')
  findMySales(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findMySales(user.sub);
  }

  @Get('by-conversation/:conversationId')
  findByConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.findByConversation(conversationId, user.sub);
  }

  @Patch(':id/deliver')
  @HttpCode(HttpStatus.OK)
  markDelivered(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.markDelivered(id, user.sub);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.cancel(id, user.sub);
  }

  @Post(':id/send-payment-info')
  @HttpCode(HttpStatus.OK)
  sendPaymentInfo(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.sendPaymentInfo(id, user.sub);
  }

  @Post(':id/send-contact')
  @HttpCode(HttpStatus.OK)
  sendContactInfo(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.sendContactInfo(id, user.sub);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.completeByReview(id, user.sub);
  }
}
