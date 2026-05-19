import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController, KycAdminController } from './kyc.controller';
import { BcraProvider } from './bcra-provider';
import { WalletModule } from '../wallet/wallet.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [WalletModule, ConfigModule],
  controllers: [KycController, KycAdminController],
  providers: [KycService, BcraProvider],
  exports: [KycService],
})
export class KycModule {}
