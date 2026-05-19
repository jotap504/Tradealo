import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, desc, lt, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util';
import type { CreateReviewDto } from './dto/create-review.dto';

type DB = NodePgDatabase<typeof schema>;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class ReviewsService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async create(reviewerId: string, dto: CreateReviewDto) {
    if (reviewerId === dto.reviewedId) {
      throw new BadRequestException('SELF_REVIEW_NOT_ALLOWED');
    }

    const [listing] = await this.db
      .select({ id: schema.listings.id })
      .from(schema.listings)
      .where(eq(schema.listings.id, dto.listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');

    return this.db.transaction(async (tx) => {
      let review;
      try {
        [review] = await tx
          .insert(schema.reviews)
          .values({
            listingId: dto.listingId,
            reviewerId,
            reviewedId: dto.reviewedId,
            direction: dto.direction,
            overallRating: dto.overallRating,
            comment: dto.comment,
            isPublic: dto.isPublic ?? true,
          })
          .returning();
      } catch (err: unknown) {
        const pg = err as { code?: string };
        if (pg.code === '23505')
          throw new ConflictException('REVIEW_ALREADY_EXISTS');
        throw err;
      }

      await this.updateReputation(
        tx,
        dto.reviewedId,
        dto.direction,
        dto.overallRating,
      );

      return review;
    });
  }

  async findByUser(userId: string, cursor?: string, limit = DEFAULT_LIMIT) {
    const pageSize = Math.min(limit, MAX_LIMIT);
    const conditions = [
      eq(schema.reviews.reviewedId, userId),
      eq(schema.reviews.isPublic, true),
    ];

    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      conditions.push(
        or(
          lt(schema.reviews.createdAt, createdAt),
          and(
            eq(schema.reviews.createdAt, createdAt),
            lt(schema.reviews.id, id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.reviews)
      .where(and(...conditions))
      .orderBy(desc(schema.reviews.createdAt), desc(schema.reviews.id))
      .limit(pageSize + 1);

    const hasMore = rows.length > pageSize;
    const data = hasMore ? rows.slice(0, pageSize) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { data, nextCursor, hasMore };
  }

  async getReputation(userId: string) {
    const [score] = await this.db
      .select()
      .from(schema.reputationScores)
      .where(eq(schema.reputationScores.userId, userId))
      .limit(1);

    return (
      score ?? {
        userId,
        asSellerAvg: '0',
        asSellerCount: 0,
        asBuyerAvg: '0',
        asBuyerCount: 0,
        updatedAt: new Date(),
      }
    );
  }

  async reply(reviewId: string, userId: string, replyText: string) {
    const [review] = await this.db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.id, reviewId))
      .limit(1);

    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');
    if (review.reviewedId !== userId)
      throw new ForbiddenException('NOT_REVIEWED_USER');
    if (review.direction !== 'buyer_to_seller')
      throw new BadRequestException('CANNOT_REPLY');

    const [updated] = await this.db
      .update(schema.reviews)
      .set({ replyText, replyCreatedAt: new Date() })
      .where(eq(schema.reviews.id, reviewId))
      .returning();

    return updated;
  }

  private async updateReputation(
    tx: DB,
    reviewedId: string,
    direction: string,
    rating: number,
  ): Promise<void> {
    const isSellerReview = direction === 'buyer_to_seller';

    await tx
      .insert(schema.reputationScores)
      .values({
        userId: reviewedId,
        asSellerAvg: isSellerReview ? String(rating) : '0',
        asSellerCount: isSellerReview ? 1 : 0,
        asBuyerAvg: isSellerReview ? '0' : String(rating),
        asBuyerCount: isSellerReview ? 0 : 1,
      })
      .onConflictDoUpdate({
        target: schema.reputationScores.userId,
        set: isSellerReview
          ? {
              asSellerAvg: sql`(${schema.reputationScores.asSellerAvg}::numeric * ${schema.reputationScores.asSellerCount} + ${rating}) / (${schema.reputationScores.asSellerCount} + 1)`,
              asSellerCount: sql`${schema.reputationScores.asSellerCount} + 1`,
              updatedAt: new Date(),
            }
          : {
              asBuyerAvg: sql`(${schema.reputationScores.asBuyerAvg}::numeric * ${schema.reputationScores.asBuyerCount} + ${rating}) / (${schema.reputationScores.asBuyerCount} + 1)`,
              asBuyerCount: sql`${schema.reputationScores.asBuyerCount} + 1`,
              updatedAt: new Date(),
            },
      });
  }
}
