import { Module } from '@nestjs/common';
import { CartApiService } from './cart-api.service';
import { CartApiController } from './cart-api.controller';

@Module({
  controllers: [CartApiController],
  providers: [CartApiService],
})
export class CartApiModule {}
