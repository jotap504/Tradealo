import { Module } from '@nestjs/common';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokensController } from './api-tokens.controller';
import { ShopSubscriptionModule } from '../shop-subscription/shop-subscription.module';
import { ApiTokenAuthGuard } from '../common/guards/api-token-auth.guard';

@Module({
  imports: [ShopSubscriptionModule],
  controllers: [ApiTokensController],
  providers: [ApiTokensService, ApiTokenAuthGuard],
  exports: [ApiTokensService, ApiTokenAuthGuard],
})
export class ApiTokensModule {}
