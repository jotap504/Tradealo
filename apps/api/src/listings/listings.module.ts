import { Module } from '@nestjs/common'
import { ListingsService } from './listings.service'
import { ListingsController } from './listings.controller'
import { ListingImagesService } from './listing-images.service'
import { ListingImagesController } from './listing-images.controller'
import { WalletModule } from '../wallet/wallet.module'

@Module({
  imports: [WalletModule],
  controllers: [ListingsController, ListingImagesController],
  providers: [ListingsService, ListingImagesService],
  exports: [ListingsService],
})
export class ListingsModule {}
