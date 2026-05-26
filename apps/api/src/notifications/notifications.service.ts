import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, isNull, count } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Resend } from 'resend';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';

type DB = NodePgDatabase<typeof schema>;

export interface SendNotificationParams {
  userId: string;
  channel: 'email' | 'push' | 'in_app';
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  toEmail?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend | null;
  private readonly oneSignalAppId: string;
  private readonly oneSignalKey: string;
  private readonly fromEmail: string;

  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
    if (!this.resend)
      this.logger.warn('RESEND_API_KEY not set — email notifications disabled');
    this.oneSignalAppId = process.env.ONESIGNAL_APP_ID ?? '';
    this.oneSignalKey = process.env.ONESIGNAL_API_KEY ?? '';
    this.fromEmail = process.env.MAIL_FROM ?? 'noreply@trocalia.ar';
  }

  async send(params: SendNotificationParams): Promise<void> {
    const [notification] = await this.db
      .insert(schema.notifications)
      .values({
        userId: params.userId,
        channel: params.channel,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data,
        status: 'pending',
      })
      .returning();

    try {
      if (params.channel === 'email') {
        const email =
          params.toEmail ?? (await this.getUserEmail(params.userId));
        await this.sendEmail(email, params.title, params.body);
      } else if (params.channel === 'push') {
        await this.sendPush(
          params.userId,
          params.title,
          params.body,
          params.data,
        );
      }

      await this.db
        .update(schema.notifications)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(schema.notifications.id, notification.id));
    } catch (err) {
      this.logger.error(
        `Notification send failed [${params.channel}] user=${params.userId}`,
        err,
      );
      await this.db
        .update(schema.notifications)
        .set({ status: 'failed' })
        .where(eq(schema.notifications.id, notification.id));
    }
  }

  async countUnread(userId: string): Promise<{ count: number }> {
    const [row] = await this.db
      .select({ n: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          isNull(schema.notifications.readAt),
        ),
      );
    return { count: row?.n ?? 0 };
  }

  async findForUser(userId: string, unreadOnly = false) {
    const conditions = [eq(schema.notifications.userId, userId)];
    if (unreadOnly) conditions.push(isNull(schema.notifications.readAt));

    const rows = await this.db
      .select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);

    return {
      data: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.body,
        read: n.readAt !== null,
        createdAt: n.createdAt,
        data: n.data,
      })),
    };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const [notification] = await this.db
      .select({
        id: schema.notifications.id,
        userId: schema.notifications.userId,
      })
      .from(schema.notifications)
      .where(eq(schema.notifications.id, notificationId))
      .limit(1);

    if (!notification) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    if (notification.userId !== userId)
      throw new NotFoundException('NOTIFICATION_NOT_FOUND');

    await this.db
      .update(schema.notifications)
      .set({ readAt: new Date(), status: 'read' })
      .where(eq(schema.notifications.id, notificationId));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(schema.notifications)
      .set({ readAt: new Date(), status: 'read' })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          isNull(schema.notifications.readAt),
        ),
      );
  }

  async sendDirectEmail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    try {
      await this.sendEmail(to, subject, text);
    } catch (err) {
      this.logger.error(
        `sendDirectEmail failed: to=${to} subject=${subject}`,
        err,
      );
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Email skipped (no RESEND_API_KEY): to=${to} subject=${subject}`,
      );
      return;
    }
    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject,
      text,
    });
  }

  private async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${this.oneSignalKey}`,
      },
      body: JSON.stringify({
        app_id: this.oneSignalAppId,
        include_external_user_ids: [userId],
        headings: { en: title },
        contents: { en: body },
        data: data ?? {},
      }),
    });

    if (!response.ok) {
      throw new Error(`OneSignal error: ${response.status}`);
    }
  }

  private async getUserEmail(userId: string): Promise<string> {
    const [user] = await this.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user)
      throw new Error(`User ${userId} not found for email notification`);
    return user.email;
  }
}
