import { Injectable, Inject, Logger } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { ListingsService } from '../listings/listings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { processExcelImport } from './excel-import.processor';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class ExcelImportRunner {
  private readonly logger = new Logger(ExcelImportRunner.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly listings: ListingsService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  start(jobId: string): void {
    void processExcelImport(jobId, {
      db: this.db,
      listings: this.listings,
      notifications: this.notifications,
      storage: this.storage,
    }).catch((err) => {
      this.logger.error(
        `processExcelImport(${jobId}) crashed: ${(err as Error).message}`,
      );
    });
  }
}
