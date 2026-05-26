import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, desc, and, lt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { disputes, disputeMessages } from '../database/schema';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class DisputesService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  // ─── User: create a dispute ───────────────────────────────────────────────────

  async createDispute(
    initiatorId: string,
    dto: {
      respondentId: string;
      listingId?: string;
      subject: string;
      description: string;
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
      .returning();

    this.notificationsService
      .send({
        userId: dto.respondentId,
        channel: 'in_app',
        type: 'dispute',
        title: 'Nuevo reclamo recibido',
        body: `Se abrió un reclamo por: ${dto.subject}`,
        data: {
          disputeId: created.id,
          listingId: dto.listingId ?? null,
          href: '/my-sales',
        },
      })
      .catch(() => null);

    return created;
  }

  // ─── User: list disputes for a user ──────────────────────────────────────────

  async listUserDisputes(userId: string) {
    return this.db
      .select()
      .from(disputes)
      .where(
        or(eq(disputes.initiatorId, userId), eq(disputes.respondentId, userId)),
      )
      .orderBy(desc(disputes.updatedAt));
  }

  // ─── Get single dispute with messages ─────────────────────────────────────────

  async getDispute(id: string, userId?: string) {
    const [dispute] = await this.db
      .select()
      .from(disputes)
      .where(eq(disputes.id, id))
      .limit(1);

    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} not found`);
    }

    if (
      userId &&
      dispute.initiatorId !== userId &&
      dispute.respondentId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const messages = await this.db
      .select()
      .from(disputeMessages)
      .where(eq(disputeMessages.disputeId, id))
      .orderBy(disputeMessages.createdAt);

    return { ...dispute, messages };
  }

  // ─── Add message to a dispute ─────────────────────────────────────────────────

  async addMessage(
    disputeId: string,
    authorId: string,
    authorType: 'user' | 'admin',
    message: string,
    imageUrl?: string,
  ) {
    const [dispute] = await this.db
      .select()
      .from(disputes)
      .where(eq(disputes.id, disputeId))
      .limit(1);

    if (!dispute) throw new NotFoundException(`Dispute ${disputeId} not found`);

    if (
      authorType === 'user' &&
      dispute.initiatorId !== authorId &&
      dispute.respondentId !== authorId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const [msg] = await this.db
      .insert(disputeMessages)
      .values({
        disputeId,
        authorId,
        authorType,
        message,
        imageUrl: imageUrl ?? null,
      })
      .returning();

    await this.db
      .update(disputes)
      .set({ updatedAt: new Date() })
      .where(eq(disputes.id, disputeId));

    if (authorType === 'user') {
      const recipientId =
        authorId === dispute.initiatorId
          ? dispute.respondentId
          : dispute.initiatorId;
      const recipientHref =
        authorId === dispute.initiatorId ? '/my-sales' : '/my-purchases';

      this.notificationsService
        .send({
          userId: recipientId,
          channel: 'in_app',
          type: 'dispute',
          title: 'Nuevo mensaje en tu reclamo',
          body: message.length > 80 ? message.slice(0, 80) + '…' : message,
          data: {
            disputeId,
            listingId: dispute.listingId,
            href: recipientHref,
          },
        })
        .catch(() => null);
    }

    return msg;
  }

  // ─── User: upload image attachment for a dispute message ──────────────────────

  async uploadDisputeImage(
    disputeId: string,
    userId: string,
    data: string,
    mimetype: string,
  ): Promise<string> {
    const [dispute] = await this.db
      .select({
        initiatorId: disputes.initiatorId,
        respondentId: disputes.respondentId,
      })
      .from(disputes)
      .where(eq(disputes.id, disputeId))
      .limit(1);

    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.initiatorId !== userId && dispute.respondentId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const buffer = Buffer.from(data, 'base64');
    const ext =
      mimetype === 'image/png'
        ? 'png'
        : mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const key = `disputes/${disputeId}/${Date.now()}.${ext}`;
    return this.storageService.uploadBuffer(key, buffer, mimetype);
  }

  // ─── User: close their own dispute ────────────────────────────────────────────

  async closeDisputeByUser(id: string, userId: string) {
    const [dispute] = await this.db
      .select()
      .from(disputes)
      .where(eq(disputes.id, id))
      .limit(1);

    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.initiatorId !== userId && dispute.respondentId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const [updated] = await this.db
      .update(disputes)
      .set({ status: 'closed', resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();

    const recipientId =
      userId === dispute.initiatorId
        ? dispute.respondentId
        : dispute.initiatorId;
    const recipientHref =
      userId === dispute.initiatorId ? '/my-sales' : '/my-purchases';

    this.notificationsService
      .send({
        userId: recipientId,
        channel: 'in_app',
        type: 'dispute',
        title: 'Reclamo cerrado',
        body: `El reclamo "${dispute.subject}" fue cerrado por la otra parte.`,
        data: {
          disputeId: id,
          listingId: dispute.listingId,
          href: recipientHref,
        },
      })
      .catch(() => null);

    return updated;
  }

  // ─── Admin: list disputes with cursor pagination ───────────────────────────────

  async listAdminDisputes(params: {
    status?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];

    if (params.status) {
      conditions.push(eq(disputes.status, params.status));
    }
    if (params.cursor) {
      const { createdAt: cursorDate, id: cursorId } = decodeCursor(
        params.cursor,
      );
      conditions.push(
        or(
          lt(disputes.createdAt, cursorDate),
          and(eq(disputes.createdAt, cursorDate), lt(disputes.id, cursorId)),
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(disputes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(disputes.createdAt), desc(disputes.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({ createdAt: lastRow.createdAt!, id: lastRow.id })
        : null;

    return { data, nextCursor };
  }

  // ─── Admin: assign dispute ────────────────────────────────────────────────────

  async assignDispute(id: string, adminId: string) {
    const [updated] = await this.db
      .update(disputes)
      .set({ assignedTo: adminId, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();

    if (!updated) throw new NotFoundException(`Dispute ${id} not found`);
    return updated;
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
      .returning();

    if (!updated) throw new NotFoundException(`Dispute ${id} not found`);
    return updated;
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
      .returning();

    if (!updated) throw new NotFoundException(`Dispute ${id} not found`);
    return updated;
  }
}
