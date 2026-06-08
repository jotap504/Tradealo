import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { ExcelImportService } from './excel-import.service';
import { ExcelImportRunner } from './excel-import-runner.service';
import type { ColumnMapping } from './excel-ai-mapper.service';

type DB = NodePgDatabase<typeof schema>;

const PROVIDER = 'excel';

@Controller('excel-import')
export class ExcelImportController {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly excel: ExcelImportService,
    private readonly runner: ExcelImportRunner,
  ) {}

  @Post('preview')
  async preview(
    @CurrentUser() user: JwtPayload,
    @Body() body: { filename: string; base64: string },
  ) {
    await this.ensureMiTienda(user.sub);
    if (!body?.base64 || !body?.filename) {
      throw new BadRequestException('MISSING_FILE');
    }
    return this.excel.createPreview(user.sub, body.base64, body.filename);
  }

  @Post(':jobId/confirm')
  async confirm(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
    @Body() body: { mapping: ColumnMapping[] },
  ) {
    await this.ensureMiTienda(user.sub);
    if (!Array.isArray(body?.mapping)) {
      throw new BadRequestException('MISSING_MAPPING');
    }
    const result = await this.excel.confirmAndStart(
      user.sub,
      jobId,
      body.mapping,
    );
    this.runner.start(jobId);
    return result;
  }

  @Get(':jobId')
  async getJob(
    @CurrentUser() user: JwtPayload,
    @Param('jobId') jobId: string,
  ) {
    const [job] = await this.db
      .select()
      .from(schema.importJobs)
      .where(
        and(
          eq(schema.importJobs.id, jobId),
          eq(schema.importJobs.userId, user.sub),
          eq(schema.importJobs.provider, PROVIDER),
        ),
      )
      .limit(1);
    if (!job) throw new BadRequestException('JOB_NOT_FOUND');
    const items = await this.db
      .select()
      .from(schema.importJobItems)
      .where(eq(schema.importJobItems.jobId, jobId))
      .limit(200);
    return { job, items };
  }

  private async ensureMiTienda(userId: string): Promise<void> {
    const [sub] = await this.db
      .select({ status: schema.shopSubscriptions.status })
      .from(schema.shopSubscriptions)
      .where(eq(schema.shopSubscriptions.userId, userId))
      .limit(1);
    if (!sub || sub.status !== 'active') {
      throw new ForbiddenException('MI_TIENDA_REQUIRED');
    }
  }
}
