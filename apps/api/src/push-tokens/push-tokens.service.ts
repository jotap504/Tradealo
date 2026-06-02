import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, ne } from 'drizzle-orm';
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

    const now = new Date();
    const newToken = input.token.trim();

    // Prune any prior tokens registered by the same device for this user.
    // FCM rotates tokens on reinstall/clear-data; without this, the user
    // ends up receiving N copies of every push (one per stale token).
    if (input.deviceId) {
      await this.db
        .delete(pushTokens)
        .where(
          and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.deviceId, input.deviceId),
            ne(pushTokens.token, newToken),
          ),
        );

      // Legacy rows from older client builds that never sent a deviceId.
      // Safe to drop now that this device is identifying itself — keeps
      // multi-device users intact (their other devices will re-register
      // with their own deviceId on next login).
      await this.db
        .delete(pushTokens)
        .where(
          and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.platform, input.platform),
            isNull(pushTokens.deviceId),
            ne(pushTokens.token, newToken),
          ),
        );
    }

    // Same device can re-login as a different user. The token is the unique
    // key, so we upsert: re-assign userId and bump lastSeen.
    const [row] = await this.db
      .insert(pushTokens)
      .values({
        userId,
        token: newToken,
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
