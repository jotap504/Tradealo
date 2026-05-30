import { Module } from '@nestjs/common';
import { McpShopService } from './mcp-shop.service';
import { McpShopController } from './mcp-shop.controller';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { ListingsModule } from '../listings/listings.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [ApiTokensModule, ListingsModule, CategoriesModule],
  controllers: [McpShopController],
  providers: [McpShopService],
})
export class McpShopModule {}
