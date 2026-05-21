import { Module } from '@nestjs/common';
import { ShopSubscriptionService } from './shop-subscription.service';
import { ShopSubscriptionController } from './shop-subscription.controller';
import { ShopModule } from '../shop/shop.module';

@Module({
  imports: [ShopModule],
  controllers: [ShopSubscriptionController],
  providers: [ShopSubscriptionService],
})
export class ShopSubscriptionModule {}
