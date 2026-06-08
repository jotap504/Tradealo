import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { read, utils } from 'xlsx';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import {
  ExcelAiMapperService,
  type ColumnMapping,
} from './excel-ai-mapper.service';

type DB = NodePgDatabase<typeof schema>;

const PROVIDER = 'excel';
const MAX_ROWS = 200;

export interface ParsedSheet {
  headers: string[];
  rows: (string | number | null)[][];
}

export interface PreviewResult {
  jobId: string;
  headers: string[];
  sampleRows: (string | number | null)[][];
  totalRows: number;
  mapping: ColumnMapping[];
}

@Injectable()
export class ExcelImportService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly mapper: ExcelAiMapperService,
  ) {}

  parse(base64: string): ParsedSheet {
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      throw new BadRequestException('INVALID_BASE64');
    }
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('FILE_SIZE_OUT_OF_RANGE');
    }

    const wb = read(buffer, { type: 'buffer' });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) throw new BadRequestException('NO_SHEETS');

    const sheet = wb.Sheets[firstSheet];
    const raw = utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
    });
    if (raw.length < 2) throw new BadRequestException('NO_DATA_ROWS');

    const headers = (raw[0] ?? []).map((h) => String(h ?? '').trim());
    const rows = raw.slice(1, MAX_ROWS + 1) as (string | number | null)[][];
    return { headers, rows };
  }

  async createPreview(
    userId: string,
    base64: string,
    filename: string,
  ): Promise<PreviewResult> {
    const { headers, rows } = this.parse(base64);
    const mapping = await this.mapper.detectMapping(headers, rows.slice(0, 5));

    const [job] = await this.db
      .insert(schema.importJobs)
      .values({
        userId,
        provider: PROVIDER,
        status: 'queued',
        totalItems: rows.length,
        options: {
          filename,
          headers,
          rows,
          mapping,
          confirmed: false,
        },
      })
      .returning();

    return {
      jobId: job.id,
      headers,
      sampleRows: rows.slice(0, 5),
      totalRows: rows.length,
      mapping,
    };
  }

  async confirmAndStart(
    userId: string,
    jobId: string,
    mapping: ColumnMapping[],
  ): Promise<{ jobId: string; totalItems: number }> {
    const [job] = await this.db
      .select()
      .from(schema.importJobs)
      .where(eq(schema.importJobs.id, jobId))
      .limit(1);
    if (!job || job.userId !== userId) {
      throw new BadRequestException('JOB_NOT_FOUND');
    }
    if (job.provider !== PROVIDER) {
      throw new BadRequestException('NOT_EXCEL_JOB');
    }

    const opts = (job.options ?? {}) as Record<string, unknown>;
    const rows = (opts.rows ?? []) as (string | number | null)[][];
    if (rows.length === 0) throw new BadRequestException('NO_ROWS');

    await this.db
      .update(schema.importJobs)
      .set({
        options: { ...opts, mapping, confirmed: true },
      })
      .where(eq(schema.importJobs.id, jobId));

    await this.db.insert(schema.importJobItems).values(
      rows.map((row, idx) => ({
        jobId,
        externalProductId: this.extractSku(row, mapping, jobId, idx),
      })),
    );

    return { jobId, totalItems: rows.length };
  }

  private extractSku(
    row: (string | number | null)[],
    mapping: ColumnMapping[],
    jobId: string,
    rowIndex: number,
  ): string {
    const skuCol = mapping.find((m) => m.field === 'sku');
    const raw = skuCol ? row[skuCol.index] : null;
    const sku = raw != null ? String(raw).trim() : '';
    return sku || `${jobId.slice(0, 8)}-${rowIndex}`;
  }
}
