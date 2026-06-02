import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc, lt, or, sql, isNull, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { NotificationsService } from '../notifications/notifications.service';
import * as schema from '../database/schema';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util';

type DB = NodePgDatabase<typeof schema>;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MESSAGES_LIMIT = 50;

@Injectable()
export class MessagingService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findOrCreateConversation(buyerId: string, listingId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.buyerId, buyerId),
          eq(schema.conversations.listingId, listingId),
          eq(schema.conversations.status, 'active'),
        ),
      )
      .limit(1);

    if (existing) return existing;

    const [listing] = await this.db
      .select({
        id: schema.listings.id,
        userId: schema.listings.userId,
        title: schema.listings.title,
        price: schema.listings.price,
        currency: schema.listings.currency,
      })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');

    const [primaryImage] = await this.db
      .select({ url: schema.listingImages.url })
      .from(schema.listingImages)
      .where(
        and(
          eq(schema.listingImages.listingId, listingId),
          eq(schema.listingImages.isPrimary, true),
        ),
      )
      .limit(1);

    const [conversation] = await this.db
      .insert(schema.conversations)
      .values({
        listingId,
        buyerId,
        sellerId: listing.userId,
        listingTitle: listing.title,
        listingPrice: String(listing.price),
        listingCurrency: listing.currency,
        listingImage: primaryImage?.url ?? null,
      })
      .returning();

    return conversation;
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const conv = await this.assertParticipant(conversationId, senderId);

    const [msg] = await this.db
      .insert(schema.messages)
      .values({ conversationId, senderId, content })
      .returning();

    const recipientId =
      conv.buyerId === senderId ? conv.sellerId : conv.buyerId;

    const updateFields: Record<string, unknown> = {
      lastMessageAt: new Date(),
      lastMessageText: content,
      lastMessageSenderId: senderId,
      updatedAt: new Date(),
    };

    if (senderId === conv.buyerId) {
      updateFields.sellerUnreadCount = sql`${schema.conversations.sellerUnreadCount} + 1`;
    } else {
      updateFields.buyerUnreadCount = sql`${schema.conversations.buyerUnreadCount} + 1`;
    }

    await this.db
      .update(schema.conversations)
      .set(updateFields)
      .where(eq(schema.conversations.id, conversationId));

    const preview = content.length > 80 ? content.slice(0, 80) + '…' : content;
    const notifData = {
      conversationId,
      listingId: conv.listingId,
      senderId,
      url: `/messages/${conversationId}`,
    };

    // In-app notification for the recipient (badge / notification center)
    await this.notificationsService
      .send({
        userId: recipientId,
        channel: 'in_app',
        type: 'message',
        title: 'Nuevo mensaje',
        body: preview,
        data: notifData,
      })
      .catch(() => {});

    // Native push to all registered devices of the recipient
    await this.notificationsService
      .send({
        userId: recipientId,
        channel: 'push',
        type: 'message',
        title: 'Nuevo mensaje',
        body: preview,
        data: notifData,
      })
      .catch(() => {});

    return msg;
  }

  async getConversations(
    userId: string,
    cursor?: string,
    limit = DEFAULT_LIMIT,
  ) {
    const pageSize = Math.min(limit, MAX_LIMIT);
    const fetchCount = pageSize + 1;

    const conditions: (typeof schema.conversations.$inferSelect extends unknown
      ? any
      : never)[] = [
      or(
        eq(schema.conversations.buyerId, userId),
        eq(schema.conversations.sellerId, userId),
      )!,
    ];

    if (cursor) {
      const decoded = decodeCursor(cursor);
      conditions.push(
        or(
          lt(
            schema.conversations.lastMessageAt ??
              schema.conversations.createdAt,
            decoded.createdAt,
          ),
          and(
            eq(
              schema.conversations.lastMessageAt ??
                schema.conversations.createdAt,
              decoded.createdAt,
            ),
            lt(schema.conversations.id, decoded.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.conversations)
      .where(and(...conditions))
      .orderBy(
        desc(schema.conversations.lastMessageAt),
        desc(schema.conversations.id),
      )
      .limit(fetchCount);

    const hasMore = rows.length > pageSize;
    const data = hasMore ? rows.slice(0, pageSize) : rows;

    // Enrich with participant info
    const userIds = [...new Set(data.flatMap((r) => [r.buyerId, r.sellerId]))];
    const userRows = userIds.length
      ? await this.db
          .select({
            id: schema.users.id,
            email: schema.users.email,
            username: schema.userProfiles.username,
            avatarUrl: schema.userProfiles.avatarUrl,
          })
          .from(schema.users)
          .leftJoin(
            schema.userProfiles,
            eq(schema.userProfiles.userId, schema.users.id),
          )
          .where(inArray(schema.users.id, userIds))
      : [];

    const userMap = new Map(userRows.map((u) => [u.id, u]));

    const enriched = data.map((conv) => {
      const otherId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
      const other = userMap.get(otherId);
      return {
        ...conv,
        otherParticipant: {
          id: otherId,
          username: other?.username ?? null,
          email: other?.email ?? null,
          avatarUrl: other?.avatarUrl ?? null,
        },
        unreadCount:
          conv.buyerId === userId
            ? conv.buyerUnreadCount
            : conv.sellerUnreadCount,
      };
    });

    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({
            createdAt: new Date(last.lastMessageAt ?? last.createdAt),
            id: last.id,
          })
        : null;

    return { data: enriched, nextCursor, hasMore };
  }

  async getMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit = MESSAGES_LIMIT,
  ) {
    await this.assertParticipant(conversationId, userId);
    const pageSize = Math.min(limit, 100);
    const fetchCount = pageSize + 1;

    const conditions = [eq(schema.messages.conversationId, conversationId)];

    if (cursor) {
      const decoded = decodeCursor(cursor);
      conditions.push(
        or(
          lt(schema.messages.createdAt, decoded.createdAt),
          and(
            eq(schema.messages.createdAt, decoded.createdAt),
            lt(schema.messages.id, decoded.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.messages)
      .where(and(...conditions))
      .orderBy(desc(schema.messages.createdAt), desc(schema.messages.id))
      .limit(fetchCount);

    const hasMore = rows.length > pageSize;
    const data = hasMore ? rows.slice(0, pageSize) : rows;

    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({
            createdAt: new Date(last.createdAt),
            id: last.id,
          })
        : null;

    return { data: data.reverse(), nextCursor, hasMore };
  }

  async markRead(conversationId: string, userId: string) {
    const conv = await this.assertParticipant(conversationId, userId);
    const otherId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;

    await this.db
      .update(schema.messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(schema.messages.conversationId, conversationId),
          eq(schema.messages.senderId, otherId),
          isNull(schema.messages.readAt),
        ),
      );

    const isBuyer = conv.buyerId === userId;
    await this.db
      .update(schema.conversations)
      .set({
        ...(isBuyer ? { buyerUnreadCount: 0 } : { sellerUnreadCount: 0 }),
        updatedAt: new Date(),
      })
      .where(eq(schema.conversations.id, conversationId));
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const [row] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(
          CASE WHEN ${schema.conversations.buyerId} = ${userId}
            THEN ${schema.conversations.buyerUnreadCount}
            ELSE ${schema.conversations.sellerUnreadCount}
          END
        ), 0)`,
      })
      .from(schema.conversations)
      .where(
        or(
          eq(schema.conversations.buyerId, userId),
          eq(schema.conversations.sellerId, userId),
        )!,
      );

    return { count: Number(row?.total ?? 0) };
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const [conv] = await this.db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversationId))
      .limit(1);

    if (!conv) throw new NotFoundException('CONVERSATION_NOT_FOUND');
    if (conv.buyerId !== userId && conv.sellerId !== userId)
      throw new ForbiddenException('NOT_CONVERSATION_PARTICIPANT');

    return conv;
  }
}
