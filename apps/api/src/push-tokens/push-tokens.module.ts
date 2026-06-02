import { Module } from '@nestjs/common';
import { PushTokensService } from './push-tokens.service';
import { PushTokensController } from './push-tokens.controller';
import { PushDispatcherService } from './push-dispatcher.service';

@Module({
  controllers: [PushTokensController],
  providers: [PushTokensService, PushDispatcherService],
  exports: [PushTokensService, PushDispatcherService],
})
export class PushTokensModule {}
