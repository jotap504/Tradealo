import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, desc, lt, or, sql, gte } from 'drizzle-orm';
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

      if (await this.reputationEligible(reviewerId, tx)) {
        await this.updateReputation(
          tx,
          dto.reviewedId,
          dto.direction,
          dto.overallRating,
        );
      }

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
      .select({
        id: schema.reviews.id,
        listingId: schema.reviews.listingId,
        reviewerId: schema.reviews.reviewerId,
        reviewedId: schema.reviews.reviewedId,
        direction: schema.reviews.direction,
        rating: schema.reviews.overallRating,
        comment: schema.reviews.comment,
        replyText: schema.reviews.replyText,
        replyCreatedAt: schema.reviews.replyCreatedAt,
        createdAt: schema.reviews.createdAt,
        reviewer: {
          id: schema.userProfiles.userId,
          username: schema.userProfiles.username,
          avatarUrl: schema.userProfiles.avatarUrl,
        },
      })
      .from(schema.reviews)
      .leftJoin(
        schema.userProfiles,
        eq(schema.userProfiles.userId, schema.reviews.reviewerId),
      )
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

  /**
   * A review counts toward reputation only when:
   *   1. The reviewer has KYC level >= 1 (verified identity)
   *   2. The reviewer has submitted at most 2 reputation-counted reviews
   *      in the current calendar month (limits fake-account inflation)
   *
   * The review is always stored and shown publicly; this only gates the
   * score update.
   */
  private async reputationEligible(
    reviewerId: string,
    tx: DB,
  ): Promise<boolean> {
    const [reviewer] = await tx
      .select({ kycLevel: schema.users.kycLevel })
      .from(schema.users)
      .where(eq(schema.users.id, reviewerId))
      .limit(1);

    if (!reviewer || reviewer.kycLevel < 1) return false;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)` })
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.reviewerId, reviewerId),
          gte(schema.reviews.createdAt, startOfMonth),
        ),
      );

    // The current review is already inserted at this point, so <= 2 means
    // it is the 1st or 2nd review this month.
    return Number(total) <= 2;
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
              asSellerAvg: sql`(${schema.reputationScores.asSellerAvg}::numeric * ${schema.reputationScores.asSellerCount} + ${rating}::numeric) / (${schema.reputationScores.asSellerCount} + 1)`,
              asSellerCount: sql`${schema.reputationScores.asSellerCount} + 1`,
              updatedAt: new Date(),
            }
          : {
              asBuyerAvg: sql`(${schema.reputationScores.asBuyerAvg}::numeric * ${schema.reputationScores.asBuyerCount} + ${rating}::numeric) / (${schema.reputationScores.asBuyerCount} + 1)`,
              asBuyerCount: sql`${schema.reputationScores.asBuyerCount} + 1`,
              updatedAt: new Date(),
            },
      });
  }
}
