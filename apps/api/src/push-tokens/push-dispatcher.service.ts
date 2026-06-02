import { Inject, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { pushTokens } from '../database/schema';
import { PushTokensService } from './push-tokens.service';

type DB = NodePgDatabase<typeof schema>;

export interface PushPayload {
  title: string;
  body: string;
  /** Delivered as `data` to the FCM client. Android reads `url` to deeplink. */
  data?: Record<string, string>;
}

@Injectable()
export class PushDispatcherService {
  private readonly logger = new Logger(PushDispatcherService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly tokens: PushTokensService,
  ) {}

  async sendToUser(
    userId: string,
    payload: PushPayload,
  ): Promise<{ delivered: number; pruned: number }> {
    if (admin.apps.length === 0) {
      this.logger.warn('firebase-admin not initialized — push skipped');
      return { delivered: 0, pruned: 0 };
    }

    const rows = await this.tokens.getTokensForUser(userId);
    if (rows.length === 0) return { delivered: 0, pruned: 0 };

    let delivered = 0;
    let pruned = 0;

    await Promise.all(
      rows.map(async ({ token }) => {
        try {
          await admin.messaging().send({
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
            android: { priority: 'high' },
          });
          delivered++;
        } catch (err) {
          const code = (err as { code?: string }).code ?? '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            await this.db.delete(pushTokens).where(eq(pushTokens.token, token));
            pruned++;
          } else {
            this.logger.warn(
              `FCM send failed userId=${userId} code=${code}`,
              err as Error,
            );
          }
        }
      }),
    );

    return { delivered, pruned };
  }
}
