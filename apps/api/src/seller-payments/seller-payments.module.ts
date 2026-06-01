import { Module } from '@nestjs/common';
import { SellerPaymentsService } from './seller-payments.service';
import { SellerPaymentsController } from './seller-payments.controller';

@Module({
  controllers: [SellerPaymentsController],
  providers: [SellerPaymentsService],
  exports: [SellerPaymentsService],
})
export class SellerPaymentsModule {}
