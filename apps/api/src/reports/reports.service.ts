import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, and, lt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { reports } from '../database/schema';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  // ─── User: create a report ────────────────────────────────────────────────────

  async createReport(
    reporterId: string,
    dto: {
      targetType: 'listing' | 'user';
      targetId: string;
      reason: string;
      description?: string;
    },
  ) {
    const [created] = await this.db
      .insert(reports)
      .values({
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description ?? null,
      })
      .returning();

    return created;
  }

  // ─── Admin: list reports with filters + cursor pagination ─────────────────────

  async listReports(params: {
    status?: string;
    targetType?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];

    if (params.status) {
      conditions.push(eq(reports.status, params.status));
    }
    if (params.targetType) {
      conditions.push(eq(reports.targetType, params.targetType));
    }
    if (params.cursor) {
      const { createdAt: cursorDate, id: cursorId } = decodeCursor(
        params.cursor,
      );
      conditions.push(
        or(
          lt(reports.createdAt, cursorDate),
          and(eq(reports.createdAt, cursorDate), lt(reports.id, cursorId)),
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(reports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt), desc(reports.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({ createdAt: lastRow.createdAt, id: lastRow.id })
        : null;

    return { data, nextCursor };
  }

  // ─── Admin: get single report ─────────────────────────────────────────────────

  async getReport(id: string) {
    const [report] = await this.db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return report;
  }

  // ─── Admin: assign report ─────────────────────────────────────────────────────

  async assignReport(id: string, adminId: string) {
    const [updated] = await this.db
      .update(reports)
      .set({ assignedTo: adminId })
      .where(eq(reports.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return updated;
  }

  // ─── Admin: resolve report ────────────────────────────────────────────────────

  async resolveReport(id: string, resolution: string, _adminId: string) {
    const [updated] = await this.db
      .update(reports)
      .set({
        status: 'resolved',
        resolution,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return updated;
  }

  // ─── Admin: dismiss report ────────────────────────────────────────────────────

  async dismissReport(id: string, resolution: string, _adminId: string) {
    const [updated] = await this.db
      .update(reports)
      .set({
        status: 'dismissed',
        resolution,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return updated;
  }
}
