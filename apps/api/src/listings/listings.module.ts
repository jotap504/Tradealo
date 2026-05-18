import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { ListingImagesService } from './listing-images.service';
import { ListingImagesController } from './listing-images.controller';
import { WalletModule } from '../wallet/wallet.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [WalletModule, MessagingModule, NotificationsModule, OrdersModule],
  controllers: [ListingsController, ListingImagesController],
  providers: [ListingsService, ListingImagesService],
  exports: [ListingsService],
})
export class ListingsModule {}
