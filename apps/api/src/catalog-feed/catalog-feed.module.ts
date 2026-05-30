import { Module } from '@nestjs/common';
import { CatalogFeedService } from './catalog-feed.service';
import { CatalogFeedController } from './catalog-feed.controller';

@Module({
  controllers: [CatalogFeedController],
  providers: [CatalogFeedService],
  exports: [CatalogFeedService],
})
export class CatalogFeedModule {}
