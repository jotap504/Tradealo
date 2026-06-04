import { Module } from '@nestjs/common';
import { MercadolibreController } from './mercadolibre.controller';
import { MercadolibreApiClient } from './mercadolibre-api.client';
import { MercadolibreOauthService } from './mercadolibre-oauth.service';
import { MlImageService } from './ml-image.service';
import { MlAiDrafterService } from './ml-ai-drafter.service';
import { MlImportRunner } from './ml-import-runner.service';
import { StorageModule } from '../storage/storage.module';
import { ListingsModule } from '../listings/listings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [StorageModule, ListingsModule, NotificationsModule],
  controllers: [MercadolibreController],
  providers: [
    MercadolibreApiClient,
    MercadolibreOauthService,
    MlImageService,
    MlAiDrafterService,
    MlImportRunner,
  ],
  exports: [
    MercadolibreApiClient,
    MercadolibreOauthService,
    MlImageService,
    MlAiDrafterService,
  ],
})
export class MercadolibreModule {}
