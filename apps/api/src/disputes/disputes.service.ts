import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common'
import { eq, desc, and, lt, or } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { DRIZZLE_TOKEN } from '../database/database.module'
import * as schema from '../database/schema'
import { disputes, disputeMessages } from '../database/schema'
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util'

type DB = NodePgDatabase<typeof schema>

@Injectable()
export class DisputesService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
  ) {}

  // ─── User: create a dispute ───────────────────────────────────────────────────

  async createDispute(
    initiatorId: string,
    dto: {
      respondentId: string
      listingId?: string
      subject: string
      description: string
    },
  ) {
    const [created] = await this.db
      .insert(disputes)
      .values({
        initiatorId,
        respondentId: dto.respondentId,
        listingId: dto.listingId ?? null,
        subject: dto.subject,
        description: dto.description,
      })
      .returning()

    return created
  }

  // ─── User: list disputes for a user ──────────────────────────────────────────

  async listUserDisputes(userId: string) {
    return this.db
      .select()
      .from(disputes)
      .where(
        or(
          eq(disputes.initiatorId, userId),
          eq(disputes.respondentId, userId),
        ),
      )
      .orderBy(desc(disputes.updatedAt))
  }

  // ─── Get single dispute with messages ─────────────────────────────────────────

  async getDispute(id: string, userId?: string) {
    const [dispute] = await this.db
      .select()
      .from(disputes)
      .where(eq(disputes.id, id))
      .limit(1)

    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} not found`)
    }

    if (userId && dispute.initiatorId !== userId && dispute.respondentId !== userId) {
      throw new ForbiddenException('Access denied')
    }

    const messages = await this.db
      .select()
      .from(disputeMessages)
      .where(eq(disputeMessages.disputeId, id))
      .orderBy(disputeMessages.createdAt)

    return { ...dispute, messages }
  }

  // ─── Add message to a dispute ─────────────────────────────────────────────────

  async addMessage(
    disputeId: string,
    authorId: string,
    authorType: 'user' | 'admin',
    message: string,
  ) {
    const [msg] = await this.db
      .insert(disputeMessages)
      .values({ disputeId, authorId, authorType, message })
      .returning()

    // Touch updated_at on the parent dispute
    await this.db
      .update(disputes)
      .set({ updatedAt: new Date() })
      .where(eq(disputes.id, disputeId))

    return msg
  }

  // ─── Admin: list disputes with cursor pagination ───────────────────────────────

  async listAdminDisputes(params: {
    status?: string
    cursor?: string
    limit?: number
  }) {
    const limit = Math.min(params.limit ?? 50, 100)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = []

    if (params.status) {
      conditions.push(eq(disputes.status, params.status))
    }
    if (params.cursor) {
      const { createdAt: cursorDate, id: cursorId } = decodeCursor(params.cursor)
      conditions.push(
        or(
          lt(disputes.createdAt, cursorDate),
          and(eq(disputes.createdAt, cursorDate), lt(disputes.id, cursorId)),
        ),
      )
    }

    const rows = await this.db
      .select()
      .from(disputes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(disputes.createdAt), desc(disputes.id))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows
    const lastRow = data[data.length - 1]
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({ createdAt: lastRow.createdAt!, id: lastRow.id })
        : null

    return { data, nextCursor }
  }

  // ─── Admin: assign dispute ────────────────────────────────────────────────────

  async assignDispute(id: string, adminId: string) {
    const [updated] = await this.db
      .update(disputes)
      .set({ assignedTo: adminId, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException(`Dispute ${id} not found`)
    }
    return updated
  }

  // ─── Admin: resolve dispute ───────────────────────────────────────────────────

  async resolveDispute(id: string, resolution: string, _adminId: string) {
    const [updated] = await this.db
      .update(disputes)
      .set({
        status: 'resolved',
        resolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException(`Dispute ${id} not found`)
    }
    return updated
  }

  // ─── Admin: close dispute ─────────────────────────────────────────────────────

  async closeDispute(id: string, resolution: string, _adminId: string) {
    const [updated] = await this.db
      .update(disputes)
      .set({
        status: 'closed',
        resolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning()

    if (!updated) {
      throw new NotFoundException(`Dispute ${id} not found`)
    }
    return updated
  }
}
