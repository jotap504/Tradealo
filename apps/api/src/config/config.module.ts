import { Module, Global } from '@nestjs/common'
import { ConfigService } from './config.service'
import { AdminConfigService } from './admin-config.service'

@Global()
@Module({
  providers: [ConfigService, AdminConfigService],
  exports: [ConfigService, AdminConfigService],
})
export class ConfigModule {}
