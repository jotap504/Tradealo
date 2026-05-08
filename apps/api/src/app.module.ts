import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { DatabaseModule } from './database/database.module'
import { RedisModule } from './redis/redis.module'
import { ConfigModule } from './config/config.module'
import { AuthModule } from './auth/auth.module'
import { WalletModule } from './wallet/wallet.module'
import { StorageModule } from './storage/storage.module'
import { UsersModule } from './users/users.module'
import { CategoriesModule } from './categories/categories.module'
import { ListingsModule } from './listings/listings.module'
import { AiModule } from './ai/ai.module'
import { SearchModule } from './search/search.module'
import { ReviewsModule } from './reviews/reviews.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PaymentsModule } from './payments/payments.module'
import { KycModule } from './kyc/kyc.module'
import { ModerationModule } from './moderation/moderation.module'
import { AdminModule } from './admin/admin.module'
import { JobsModule } from './jobs/jobs.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { KycLevelGuard } from './common/guards/kyc-level.guard'
import { RateLimitGuard } from './common/guards/rate-limit.guard'

@Module({
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
    AiModule,
    SearchModule,
    ReviewsModule,
    NotificationsModule,
    PaymentsModule,
    KycModule,
    ModerationModule,
    AdminModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: KycLevelGuard },
  ],
})
export class AppModule {}
