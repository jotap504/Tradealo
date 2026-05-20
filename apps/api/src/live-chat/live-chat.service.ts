import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, lt, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { listings } from '../database/schema/listings.schema';
import { users } from '../database/schema/users.schema';
import { userProfiles } from '../database/schema/users.schema';

type DB = NodePgDatabase<typeof schema>;

export interface LiveChatMessageResponse {
  id: string;
  listingId: string;
  userId: string;
  content: string;
  createdAt: string;
  username: string | null;
  avatarUrl: string | null;
  isHost: boolean;
}

@Injectable()
export class LiveChatService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async getMessages(
    listingId: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<{ messages: LiveChatMessageResponse[]; nextCursor?: string }> {
    const limit = options?.limit ?? 50;

    const listing = await this.db
      .select({ sellerId: listings.userId })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing[0]) throw new NotFoundException('Listing not found');

    const sellerId = listing[0].sellerId;

    const conditions = [eq(schema.liveChatMessages.listingId, listingId)];
    if (options?.cursor) {
      conditions.push(
        lt(schema.liveChatMessages.createdAt, new Date(options.cursor)),
      );
    }

    const rows = await this.db
      .select({
        id: schema.liveChatMessages.id,
        listingId: schema.liveChatMessages.listingId,
        userId: schema.liveChatMessages.userId,
        content: schema.liveChatMessages.content,
        createdAt: schema.liveChatMessages.createdAt,
        username: userProfiles.username,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(schema.liveChatMessages)
      .leftJoin(users, eq(schema.liveChatMessages.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(and(...conditions))
      .orderBy(desc(schema.liveChatMessages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const sliced = rows.slice(0, limit);

    const messages: LiveChatMessageResponse[] = sliced.map((row) => ({
      id: row.id,
      listingId: row.listingId,
      userId: row.userId,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      username: row.username,
      avatarUrl: row.avatarUrl,
      isHost: row.userId === sellerId,
    }));

    const nextCursor =
      hasMore && sliced.length > 0
        ? sliced[sliced.length - 1].createdAt.toISOString()
        : undefined;

    return { messages, nextCursor };
  }

  async sendMessage(
    listingId: string,
    userId: string,
    content: string,
  ): Promise<LiveChatMessageResponse> {
    const listing = await this.db
      .select({ sellerId: listings.userId })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing[0]) throw new NotFoundException('Listing not found');

    const [message] = await this.db
      .insert(schema.liveChatMessages)
      .values({ listingId, userId, content })
      .returning();

    const profile = await this.db
      .select({
        username: userProfiles.username,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return {
      id: message.id,
      listingId: message.listingId,
      userId: message.userId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      username: profile[0]?.username ?? null,
      avatarUrl: profile[0]?.avatarUrl ?? null,
      isHost: userId === listing[0].sellerId,
    };
  }
}
