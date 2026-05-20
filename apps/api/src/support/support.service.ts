import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, desc, and, lt, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { supportTickets, ticketMessages } from '../database/schema';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class SupportService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  // ─── User: create a ticket + first message ────────────────────────────────────

  async createTicket(
    userId: string,
    dto: { subject: string; category: string; message: string },
  ) {
    const [ticket] = await this.db
      .insert(supportTickets)
      .values({
        userId,
        subject: dto.subject,
        category: dto.category,
      })
      .returning();

    const [firstMessage] = await this.db
      .insert(ticketMessages)
      .values({
        ticketId: ticket.id,
        authorId: userId,
        authorType: 'user',
        message: dto.message,
      })
      .returning();

    return { ...ticket, messages: [firstMessage] };
  }

  // ─── User: list own tickets ───────────────────────────────────────────────────

  async listUserTickets(userId: string) {
    const rows = await this.db
      .select({
        ticket: supportTickets,
        messageCount: sql<number>`cast(count(${ticketMessages.id}) as int)`,
      })
      .from(supportTickets)
      .leftJoin(ticketMessages, eq(ticketMessages.ticketId, supportTickets.id))
      .where(eq(supportTickets.userId, userId))
      .groupBy(supportTickets.id)
      .orderBy(desc(supportTickets.updatedAt));

    return rows.map((r) => ({ ...r.ticket, messageCount: r.messageCount }));
  }

  // ─── Get single ticket with messages ─────────────────────────────────────────

  async getTicket(id: string, userId?: string) {
    const [ticket] = await this.db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1);

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    if (userId && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const messages = await this.db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, id))
      .orderBy(ticketMessages.createdAt);

    return { ...ticket, messages };
  }

  // ─── Add message to ticket ────────────────────────────────────────────────────

  async addMessage(
    ticketId: string,
    authorId: string,
    authorType: 'user' | 'admin',
    message: string,
  ) {
    const [ticket] = await this.db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    // Determine new status based on who is replying
    let newStatus: string | undefined;
    if (authorType === 'admin' && ticket.status === 'open') {
      newStatus = 'in_progress';
    } else if (authorType === 'user' && ticket.status === 'waiting_user') {
      newStatus = 'in_progress';
    }

    const [msg] = await this.db
      .insert(ticketMessages)
      .values({ ticketId, authorId, authorType, message })
      .returning();

    const updatedFields: Partial<typeof supportTickets.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (newStatus) {
      updatedFields.status = newStatus;
    }

    await this.db
      .update(supportTickets)
      .set(updatedFields)
      .where(eq(supportTickets.id, ticketId));

    return msg;
  }

  // ─── Admin: list tickets with filters + cursor pagination ─────────────────────

  async listAdminTickets(params: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];

    if (params.status) {
      conditions.push(eq(supportTickets.status, params.status));
    }
    if (params.priority) {
      conditions.push(eq(supportTickets.priority, params.priority));
    }
    if (params.category) {
      conditions.push(eq(supportTickets.category, params.category));
    }
    if (params.assignedTo) {
      conditions.push(eq(supportTickets.assignedTo, params.assignedTo));
    }
    if (params.cursor) {
      const { createdAt: cursorDate, id: cursorId } = decodeCursor(
        params.cursor,
      );
      conditions.push(
        or(
          lt(supportTickets.updatedAt, cursorDate),
          and(
            eq(supportTickets.updatedAt, cursorDate),
            lt(supportTickets.id, cursorId),
          ),
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(supportTickets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(supportTickets.updatedAt), desc(supportTickets.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({ createdAt: lastRow.updatedAt, id: lastRow.id })
        : null;

    return { data, nextCursor };
  }

  // ─── Admin: update ticket fields ──────────────────────────────────────────────

  async updateTicket(
    id: string,
    updates: { status?: string; priority?: string; assignedTo?: string },
    _adminId: string,
  ) {
    const setFields: Partial<typeof supportTickets.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (updates.status !== undefined) setFields.status = updates.status;
    if (updates.priority !== undefined) setFields.priority = updates.priority;
    if (updates.assignedTo !== undefined)
      setFields.assignedTo = updates.assignedTo;

    const [updated] = await this.db
      .update(supportTickets)
      .set(setFields)
      .where(eq(supportTickets.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return updated;
  }
}
