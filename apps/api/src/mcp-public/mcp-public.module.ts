import { Module } from '@nestjs/common';
import { McpPublicService } from './mcp-public.service';
import { McpPublicController } from './mcp-public.controller';
import { ListingsModule } from '../listings/listings.module';
import { CategoriesModule } from '../categories/categories.module';
import { ShopModule } from '../shop/shop.module';

@Module({
  imports: [ListingsModule, CategoriesModule, ShopModule],
  controllers: [McpPublicController],
  providers: [McpPublicService],
})
export class McpPublicModule {}
