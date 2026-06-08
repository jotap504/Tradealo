import { Module } from '@nestjs/common';
import { ExcelImportController } from './excel-import.controller';
import { ExcelImportService } from './excel-import.service';
import { ExcelImportRunner } from './excel-import-runner.service';
import { ExcelAiMapperService } from './excel-ai-mapper.service';
import { ListingsModule } from '../listings/listings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ListingsModule, NotificationsModule, StorageModule],
  controllers: [ExcelImportController],
  providers: [ExcelImportService, ExcelImportRunner, ExcelAiMapperService],
  exports: [ExcelImportService],
})
export class ExcelImportModule {}
