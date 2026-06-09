import { Module } from '@nestjs/common';
import { ListingVariantsController } from './listing-variants.controller';
import { ListingVariantsService } from './listing-variants.service';

@Module({
  controllers: [ListingVariantsController],
  providers: [ListingVariantsService],
  exports: [ListingVariantsService],
})
export class ListingVariantsModule {}
