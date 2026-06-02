import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { pushTokens } from '../database/schema';

type DB = NodePgDatabase<typeof schema>;

export type PushPlatform = 'android' | 'ios' | 'web';

export interface RegisterTokenInput {
  token: string;
  platform: PushPlatform;
  deviceId?: string;
  appVersion?: string;
}

@Injectable()
export class PushTokensService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async register(userId: string, input: RegisterTokenInput) {
    if (!input.token?.trim()) {
      throw new BadRequestException('token is required');
    }
    if (!['android', 'ios', 'web'].includes(input.platform)) {
      throw new BadRequestException('platform must be android, ios, or web');
    }

    // Same device can re-login as a different user. The token is the unique
    // key, so we upsert: re-assign userId and bump lastSeen.
    const now = new Date();
    const [row] = await this.db
      .insert(pushTokens)
      .values({
        userId,
        token: input.token.trim(),
        platform: input.platform,
        deviceId: input.deviceId,
        appVersion: input.appVersion,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: {
          userId,
          platform: input.platform,
          deviceId: input.deviceId,
          appVersion: input.appVersion,
          lastSeenAt: now,
        },
      })
      .returning();
    return { id: row.id, platform: row.platform };
  }

  async listForUser(userId: string) {
    return this.db
      .select({
        id: pushTokens.id,
        platform: pushTokens.platform,
        deviceId: pushTokens.deviceId,
        appVersion: pushTokens.appVersion,
        lastSeenAt: pushTokens.lastSeenAt,
        createdAt: pushTokens.createdAt,
      })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));
  }

  async unregister(userId: string, token: string) {
    const result = await this.db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
      .returning();
    if (result.length === 0) {
      throw new NotFoundException('Token not found');
    }
    return { ok: true };
  }

  /** Returns all valid tokens for `userId` — used by FCM dispatcher. */
  async getTokensForUser(userId: string) {
    return this.db
      .select({ token: pushTokens.token, platform: pushTokens.platform })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));
  }
}
