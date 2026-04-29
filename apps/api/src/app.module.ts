import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { DatabaseModule } from './database/database.module'
import { RedisModule } from './redis/redis.module'
import { ConfigModule } from './config/config.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { KycLevelGuard } from './common/guards/kyc-level.guard'

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    ConfigModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: KycLevelGuard },
  ],
})
export class AppModule {}
