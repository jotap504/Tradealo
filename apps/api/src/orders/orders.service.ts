import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import * as schema from '../database/schema';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly notificationsService: NotificationsService,
    private readonly messagingService: MessagingService,
  ) {}

  async create(data: {
    listingId: string;
    buyerId: string;
    sellerId: string;
    conversationId: string;
    paymentInfo?: Record<string, unknown> | null;
  }) {
    const [order] = await this.db
      .insert(schema.orders)
      .values({
        listingId: data.listingId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        conversationId: data.conversationId,
        ...(data.paymentInfo != null ? { paymentInfo: data.paymentInfo } : {}),
      })
      .returning();

    return order;
  }

  async findByConversation(conversationId: string, userId: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.conversationId, conversationId))
      .limit(1);

    if (!order) return null;
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('NOT_ORDER_PARTICIPANT');
    }

    return order;
  }

  async findMine(userId: string) {
    const asBuyer = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.buyerId, userId))
      .orderBy(schema.orders.createdAt);

    const asSeller = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.sellerId, userId))
      .orderBy(schema.orders.createdAt);

    return { asBuyer, asSeller };
  }

  async findMyPurchases(userId: string) {
    const rows = await this.db
      .select({
        order: schema.orders,
        listing: {
          id: schema.listings.id,
          title: schema.listings.title,
          price: schema.listings.price,
          currency: schema.listings.currency,
          status: schema.listings.status,
        },
        seller: {
          id: schema.users.id,
        },
        sellerProfile: {
          username: schema.userProfiles.username,
          avatarUrl: schema.userProfiles.avatarUrl,
        },
      })
      .from(schema.orders)
      .innerJoin(
        schema.listings,
        eq(schema.orders.listingId, schema.listings.id),
      )
      .innerJoin(schema.users, eq(schema.orders.sellerId, schema.users.id))
      .leftJoin(
        schema.userProfiles,
        eq(schema.userProfiles.userId, schema.orders.sellerId),
      )
      .where(eq(schema.orders.buyerId, userId))
      .orderBy(sql`${schema.orders.createdAt} DESC`);

    if (rows.length === 0) return [];

    const listingIds = rows.map((r) => r.listing.id);
    const allImages = await this.db
      .select()
      .from(schema.listingImages)
      .where(inArray(schema.listingImages.listingId, listingIds))
      .orderBy(schema.listingImages.sortOrder);

    const imageByListing = new Map<string, string>();
    for (const img of allImages) {
      if (!imageByListing.has(img.listingId)) {
        imageByListing.set(img.listingId, img.thumbnailUrl ?? img.url);
      }
    }

    return rows.map((r) => ({
      ...r.order,
      listing: {
        ...r.listing,
        primaryImageUrl: imageByListing.get(r.listing.id) ?? null,
      },
      seller: {
        id: r.seller.id,
        username: r.sellerProfile?.username ?? null,
        avatarUrl: r.sellerProfile?.avatarUrl ?? null,
      },
    }));
  }

  async findMySales(userId: string) {
    const buyerReviewAlias = alias(schema.reviews, 'buyer_review');
    const sellerReviewAlias = alias(schema.reviews, 'seller_review');

    const rows = await this.db
      .select({
        order: schema.orders,
        listing: {
          id: schema.listings.id,
          title: schema.listings.title,
          price: schema.listings.price,
          currency: schema.listings.currency,
          status: schema.listings.status,
        },
        buyer: {
          id: schema.users.id,
        },
        buyerProfile: {
          username: schema.userProfiles.username,
          avatarUrl: schema.userProfiles.avatarUrl,
        },
        buyerReview: {
          id: buyerReviewAlias.id,
          rating: buyerReviewAlias.overallRating,
          comment: buyerReviewAlias.comment,
          createdAt: buyerReviewAlias.createdAt,
          replyText: buyerReviewAlias.replyText,
          replyCreatedAt: buyerReviewAlias.replyCreatedAt,
        },
        sellerReview: {
          id: sellerReviewAlias.id,
          rating: sellerReviewAlias.overallRating,
          comment: sellerReviewAlias.comment,
          createdAt: sellerReviewAlias.createdAt,
        },
      })
      .from(schema.orders)
      .innerJoin(
        schema.listings,
        eq(schema.orders.listingId, schema.listings.id),
      )
      .innerJoin(schema.users, eq(schema.orders.buyerId, schema.users.id))
      .leftJoin(
        schema.userProfiles,
        eq(schema.userProfiles.userId, schema.orders.buyerId),
      )
      .leftJoin(
        buyerReviewAlias,
        and(
          eq(schema.orders.listingId, buyerReviewAlias.listingId),
          eq(schema.orders.buyerId, buyerReviewAlias.reviewerId),
          eq(buyerReviewAlias.direction, 'buyer_to_seller'),
        ),
      )
      .leftJoin(
        sellerReviewAlias,
        and(
          eq(schema.orders.listingId, sellerReviewAlias.listingId),
          eq(schema.orders.buyerId, sellerReviewAlias.reviewedId),
          eq(sellerReviewAlias.direction, 'seller_to_buyer'),
        ),
      )
      .where(eq(schema.orders.sellerId, userId))
      .orderBy(sql`${schema.orders.createdAt} DESC`);

    if (rows.length === 0) return [];

    const listingIds = rows.map((r) => r.listing.id);
    const allImages = await this.db
      .select()
      .from(schema.listingImages)
      .where(inArray(schema.listingImages.listingId, listingIds))
      .orderBy(schema.listingImages.sortOrder);

    const imageByListing = new Map<string, string>();
    for (const img of allImages) {
      if (!imageByListing.has(img.listingId)) {
        imageByListing.set(img.listingId, img.thumbnailUrl ?? img.url);
      }
    }

    return rows.map((r) => ({
      ...r.order,
      listing: {
        ...r.listing,
        primaryImageUrl: imageByListing.get(r.listing.id) ?? null,
      },
      buyer: {
        id: r.buyer.id,
        username: r.buyerProfile?.username ?? null,
        avatarUrl: r.buyerProfile?.avatarUrl ?? null,
      },
      buyerReview: r.buyerReview?.id
        ? {
            id: r.buyerReview.id,
            rating: r.buyerReview.rating!,
            comment: r.buyerReview.comment,
            createdAt: r.buyerReview.createdAt!,
            replyText: r.buyerReview.replyText,
            replyCreatedAt: r.buyerReview.replyCreatedAt,
          }
        : null,
      sellerReview: r.sellerReview?.id
        ? {
            id: r.sellerReview.id,
            rating: r.sellerReview.rating!,
            comment: r.sellerReview.comment,
            createdAt: r.sellerReview.createdAt!,
          }
        : null,
    }));
  }

  async markDelivered(orderId: string, userId: string) {
    const order = await this.assertSeller(orderId, userId);

    if (order.status !== 'pending') {
      throw new BadRequestException('ORDER_NOT_PENDING');
    }

    const [updated] = await this.db
      .update(schema.orders)
      .set({
        status: 'delivered',
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();

    await this.notificationsService.send({
      userId: order.buyerId,
      channel: 'in_app',
      type: 'order_delivered',
      title: 'Producto entregado',
      body: 'El vendedor marcó el producto como entregado. ¡Calificá tu experiencia!',
      data: {
        orderId,
        listingId: order.listingId,
        conversationId: order.conversationId,
      },
    });

    return updated;
  }

  async cancel(orderId: string, userId: string) {
    const order = await this.assertSeller(orderId, userId);

    if (order.status === 'completed') {
      throw new BadRequestException('ORDER_ALREADY_COMPLETED');
    }
    if (order.status === 'cancelled') {
      throw new BadRequestException('ORDER_ALREADY_CANCELLED');
    }

    const [updated] = await this.db
      .update(schema.orders)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();

    // Restore stock
    await this.db
      .update(schema.listings)
      .set({
        stock: sql`${schema.listings.stock} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.listings.id, order.listingId));

    // If listing was set to sold, revert to active
    await this.db
      .update(schema.listings)
      .set({ status: 'active', soldAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.listings.id, order.listingId),
          eq(schema.listings.status, 'sold'),
        ),
      );

    await this.notificationsService.send({
      userId: order.buyerId,
      channel: 'in_app',
      type: 'order_cancelled',
      title: 'Venta cancelada',
      body: 'El vendedor canceló la venta.',
      data: {
        orderId,
        listingId: order.listingId,
        conversationId: order.conversationId,
      },
    });

    return updated;
  }

  async sendPaymentInfo(orderId: string, userId: string) {
    const order = await this.assertSeller(orderId, userId);

    const [profile] = await this.db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, userId))
      .limit(1);

    if (!profile) throw new NotFoundException('PROFILE_NOT_FOUND');

    const lines: string[] = ['📌 Datos de pago:'];
    if (profile.cbu) lines.push(`CBU: ${profile.cbu}`);
    if (profile.alias) lines.push(`Alias: ${profile.alias}`);
    if (profile.bankName) lines.push(`Banco: ${profile.bankName}`);
    if (profile.bankAccountType && profile.bankAccountNumber) {
      lines.push(
        `Cuenta ${profile.bankAccountType}: ${profile.bankAccountNumber}`,
      );
    }

    if (lines.length === 1) {
      throw new BadRequestException('NO_PAYMENT_INFO_CONFIGURED');
    }

    await this.messagingService.sendMessage(
      order.conversationId,
      userId,
      lines.join('\n'),
    );

    return { sent: true };
  }

  async sendContactInfo(orderId: string, userId: string) {
    const order = await this.assertSeller(orderId, userId);

    const [profile] = await this.db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, userId))
      .limit(1);

    if (!profile) throw new NotFoundException('PROFILE_NOT_FOUND');

    const lines: string[] = ['📌 Datos de contacto:'];

    const [user] = await this.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (user?.email) lines.push(`Email: ${user.email}`);
    if (profile.whatsapp) {
      lines.push(
        `WhatsApp: https://wa.me/${String(profile.whatsapp).replace(/[^0-9]/g, '')}`,
      );
    }

    if (lines.length === 1) {
      throw new BadRequestException('NO_CONTACT_INFO_CONFIGURED');
    }

    await this.messagingService.sendMessage(
      order.conversationId,
      userId,
      lines.join('\n'),
    );

    return { sent: true };
  }

  async completeByReview(orderId: string, userId: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    if (order.buyerId !== userId) throw new ForbiddenException('NOT_BUYER');
    if (order.status !== 'delivered')
      throw new BadRequestException('ORDER_NOT_DELIVERED');

    const [updated] = await this.db
      .update(schema.orders)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(schema.orders.id, orderId))
      .returning();

    return updated;
  }

  private async assertSeller(orderId: string, userId: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1);

    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    if (order.sellerId !== userId) throw new ForbiddenException('NOT_SELLER');
    return order;
  }
}
