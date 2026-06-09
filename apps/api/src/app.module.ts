import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ListingsModule } from './listings/listings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagingModule } from './messaging/messaging.module';
import { LiveChatModule } from './live-chat/live-chat.module';
import { OrdersModule } from './orders/orders.module';
import { FavoritesModule } from './favorites/favorites.module';
import { KycModule } from './kyc/kyc.module';
import { ReportsModule } from './reports/reports.module';
import { DisputesModule } from './disputes/disputes.module';
import { SupportModule } from './support/support.module';
import { ShopModule } from './shop/shop.module';
import { ShopSubscriptionModule } from './shop-subscription/shop-subscription.module';
import { ShopChatbotModule } from './shop-chatbot/shop-chatbot.module';
import { ApiTokensModule } from './api-tokens/api-tokens.module';
import { McpShopModule } from './mcp-shop/mcp-shop.module';
import { McpPublicModule } from './mcp-public/mcp-public.module';
import { CatalogFeedModule } from './catalog-feed/catalog-feed.module';
import { CartApiModule } from './cart-api/cart-api.module';
import { SellerPaymentsModule } from './seller-payments/seller-payments.module';
import { PushTokensModule } from './push-tokens/push-tokens.module';
import { AiModule } from './ai/ai.module';
import { MercadolibreModule } from './mercadolibre/mercadolibre.module';
import { ExcelImportModule } from './excel-import/excel-import.module';
import { ListingVariantsModule } from './listing-variants/listing-variants.module';
// import { SearchModule } from './search/search.module'
// import { ModerationModule } from './moderation/moderation.module'
// import { JobsModule } from './jobs/jobs.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { KycLevelGuard } from './common/guards/kyc-level.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  controllers: [AppController],
  imports: [
    DatabaseModule,
    RedisModule,
    ConfigModule,
    AuthModule,
    WalletModule,
    StorageModule,
    UsersModule,
    CategoriesModule,
    ListingsModule,
    ReviewsModule,
    PaymentsModule,
    AdminModule,
    NotificationsModule,
    MessagingModule,
    LiveChatModule,
    OrdersModule,
    FavoritesModule,
    KycModule,
    ReportsModule,
    DisputesModule,
    SupportModule,
    ShopModule,
    ShopSubscriptionModule,
    ShopChatbotModule,
    ApiTokensModule,
    McpShopModule,
    McpPublicModule,
    CatalogFeedModule,
    CartApiModule,
    SellerPaymentsModule,
    PushTokensModule,
    AiModule,
    MercadolibreModule,
    ExcelImportModule,
    ListingVariantsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: KycLevelGuard },
  ],
})
export class AppModule {}
