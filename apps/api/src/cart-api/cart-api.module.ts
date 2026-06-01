import { Module } from '@nestjs/common';
import { CartApiService } from './cart-api.service';
import { CartApiController } from './cart-api.controller';
import { SellerPaymentsModule } from '../seller-payments/seller-payments.module';

@Module({
  imports: [SellerPaymentsModule],
  controllers: [CartApiController],
  providers: [CartApiService],
})
export class CartApiModule {}
