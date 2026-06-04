import { Injectable, Inject, Logger } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { ListingsService } from '../listings/listings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MercadolibreApiClient } from './mercadolibre-api.client';
import { MercadolibreOauthService } from './mercadolibre-oauth.service';
import { MlImageService } from './ml-image.service';
import { MlAiDrafterService } from './ml-ai-drafter.service';
import { processMlImport } from '../jobs/processors/ml-import.processor';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class MlImportRunner {
  private readonly logger = new Logger(MlImportRunner.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly oauth: MercadolibreOauthService,
    private readonly api: MercadolibreApiClient,
    private readonly imageService: MlImageService,
    private readonly drafter: MlAiDrafterService,
    private readonly listings: ListingsService,
    private readonly notifications: NotificationsService,
  ) {}

  start(jobId: string): void {
    void processMlImport(
      { data: { jobId } } as Parameters<typeof processMlImport>[0],
      {
        db: this.db,
        oauth: this.oauth,
        api: this.api,
        imageService: this.imageService,
        drafter: this.drafter,
        listings: this.listings,
        notifications: this.notifications,
      },
    ).catch((err) => {
      this.logger.error(
        `processMlImport(${jobId}) crashed: ${(err as Error).message}`,
      );
    });
  }
}
