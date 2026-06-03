import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  eq,
  and,
  desc,
  asc,
  lt,
  gt,
  or,
  ne,
  sql,
  gte,
  lte,
  inArray,
  ilike,
  isNotNull,
  isNull,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { ConfigService } from '../config/config.service';
import { WalletService } from '../wallet/wallet.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';
import * as schema from '../database/schema';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util';
import { LISTING } from '../common/constants/listing.constants';
import type { CreateListingDto } from './dto/create-listing.dto';
import type { ListListingsDto } from './dto/list-listings.dto';
import type { PlaceBidDto } from './dto/place-bid.dto';

type DB = NodePgDatabase<typeof schema>;
type Listing = typeof schema.listings.$inferSelect;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class ListingsService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly messagingService: MessagingService,
    private readonly notificationsService: NotificationsService,
    private readonly ordersService: OrdersService,
  ) {}

  async create(userId: string, dto: CreateListingDto): Promise<Listing> {
    const category = await this.db
      .select({
        id: schema.categories.id,
        isCollectible: schema.categories.isCollectible,
      })
      .from(schema.categories)
      .where(eq(schema.categories.id, dto.categoryId))
      .limit(1);

    if (!category[0]) throw new NotFoundException('CATEGORY_NOT_FOUND');

    const isCollectible = category[0].isCollectible;
    const type = dto.type ?? 'standard';

    const { creditsSpent, wasFreeQuota } = await this.chargePublication(
      userId,
      type,
      isCollectible,
      dto.saleType,
    );

    const durationDays =
      dto.durationDays ??
      (await this.configService.getNumber('listing.duration.default', 30));

    const locationSql =
      dto.lat !== undefined && dto.lng !== undefined
        ? sql`ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)`
        : null;

    const riskScore = this.computeRiskScore(dto);
    const moderationStatus = this.resolveModerationStatus(riskScore);

    const [listing] = await this.db
      .insert(schema.listings)
      .values({
        userId,
        categoryId: dto.categoryId,
        type,
        isCollectible,
        title: dto.title,
        description: dto.description,
        price: String(dto.price),
        currency: dto.currency,
        priceNegotiable: dto.priceNegotiable,
        condition: dto.condition,
        location: locationSql as unknown as string,
        locationText: dto.locationText,
        city: dto.city,
        province: dto.province,
        paymentMethods: dto.paymentMethods ?? [],
        shippingOptions: dto.shippingOptions ?? [],
        shippingDescription: dto.shippingDescription,
        collectibleAttributes: dto.collectibleAttributes,
        durationDays,
        creditsSpent,
        wasFreeQuota,
        moderationStatus,
        riskScore,
        status: 'draft',
        saleType: dto.saleType ?? 'contact',
        stock: dto.stock,
        contactInfo: dto.contactInfo ?? {},
        desiredPrice:
          dto.desiredPrice !== undefined
            ? Math.round(dto.desiredPrice * 100)
            : undefined,
        youtubeLiveId: dto.youtubeLiveId,
        paymentInfo: dto.paymentInfo,
      })
      .returning();

    return listing;
  }

  private async resolveCategoryId(
    categoryId: string,
  ): Promise<string | undefined> {
    // Try slug first, then fall back to treating it as a UUID
    const [cat] = await this.db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.slug, categoryId))
      .limit(1);
    if (cat) return cat.id;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(categoryId) ? categoryId : undefined;
  }

  async findAll(dto: ListListingsDto): Promise<{
    data: Listing[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const limit = Math.min(dto.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const fetchCount = limit + 1;

    const categoryId = dto.categoryId
      ? await this.resolveCategoryId(dto.categoryId)
      : undefined;

    const conditions = [
      eq(schema.listings.status, 'active'),
      eq(schema.listings.moderationStatus, 'approved' as string),
    ];

    if (categoryId) conditions.push(eq(schema.listings.categoryId, categoryId));
    if (dto.condition)
      conditions.push(
        eq(
          schema.listings.condition,
          dto.condition as (typeof schema.listings.$inferInsert)['condition'],
        ),
      );
    if (dto.province)
      conditions.push(eq(schema.listings.province, dto.province));
    if (dto.minPrice !== undefined)
      conditions.push(gte(schema.listings.price, String(dto.minPrice)));
    if (dto.maxPrice !== undefined)
      conditions.push(lte(schema.listings.price, String(dto.maxPrice)));
    if (dto.q)
      conditions.push(
        or(
          ilike(schema.listings.title, `%${dto.q}%`),
          ilike(schema.listings.description, `%${dto.q}%`),
        )!,
      );
    if (dto.city) conditions.push(ilike(schema.listings.city, `%${dto.city}%`));
    if (dto.currency)
      conditions.push(
        eq(schema.listings.currency, dto.currency as 'ARS' | 'USD'),
      );
    if (dto.type)
      conditions.push(
        eq(schema.listings.type, dto.type as 'standard' | 'premium'),
      );
    if (dto.saleType)
      conditions.push(eq(schema.listings.saleType, dto.saleType));
    if (dto.endingSoon)
      conditions.push(
        lte(
          schema.listings.expiresAt,
          sql`NOW() + INTERVAL '${dto.endingSoon} hours'`,
        ),
      );
    if (dto.paymentMethods) {
      const methods = dto.paymentMethods.split(',').filter(Boolean);
      if (methods.length > 0) {
        conditions.push(
          sql`${schema.listings.paymentMethods} ?| ${sql`ARRAY[${sql.join(
            methods.map((m) => sql`${m}`),
            sql`, `,
          )}]`}`,
        );
      }
    }

    if (dto.hasYoutubeLive) {
      conditions.push(isNotNull(schema.listings.youtubeLiveId));
    }

    if (dto.excludeYoutubeLive) {
      conditions.push(isNull(schema.listings.youtubeLiveId));
    }

    const isPremiumSort =
      !dto.sort ||
      (dto.sort !== 'price_asc' &&
        dto.sort !== 'price_desc' &&
        dto.sort !== 'reputation');
    const typeRankExpr = sql<number>`CASE WHEN ${schema.listings.type} = 'premium' THEN 0 ELSE 1 END`;

    if (dto.cursor) {
      const { createdAt, id, typeRank } = decodeCursor(dto.cursor);
      if (isPremiumSort && typeRank !== undefined) {
        conditions.push(
          or(
            gt(typeRankExpr, typeRank),
            and(
              eq(typeRankExpr, typeRank),
              lt(schema.listings.createdAt, createdAt),
            ),
            and(
              eq(typeRankExpr, typeRank),
              eq(schema.listings.createdAt, createdAt),
              lt(schema.listings.id, id),
            ),
          )!,
        );
      } else {
        conditions.push(
          or(
            lt(schema.listings.createdAt, createdAt),
            and(
              eq(schema.listings.createdAt, createdAt),
              lt(schema.listings.id, id),
            ),
          )!,
        );
      }
    }

    const orderBy =
      dto.sort === 'price_asc'
        ? [asc(schema.listings.price), desc(schema.listings.createdAt)]
        : dto.sort === 'price_desc'
          ? [desc(schema.listings.price), desc(schema.listings.createdAt)]
          : [
              asc(typeRankExpr),
              desc(schema.listings.createdAt),
              desc(schema.listings.id),
            ];

    let rows: (typeof schema.listings.$inferSelect)[];
    if (dto.sort === 'reputation') {
      const result = await this.db
        .select()
        .from(schema.listings)
        .leftJoin(
          schema.reputationScores,
          eq(schema.listings.userId, schema.reputationScores.userId),
        )
        .where(and(...conditions))
        .orderBy(
          asc(typeRankExpr),
          desc(schema.reputationScores.asSellerAvg),
          desc(schema.listings.createdAt),
        )
        .limit(fetchCount);
      rows = result.map((r) => r.listings);
    } else {
      rows = await this.db
        .select()
        .from(schema.listings)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(fetchCount);
    }

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({
            typeRank: isPremiumSort
              ? last.type === 'premium'
                ? 0
                : 1
              : undefined,
            createdAt: last.createdAt,
            id: last.id,
          })
        : null;

    // Attach images and seller data
    const ids = data.map((r) => r.id);
    if (ids.length > 0) {
      const [imageRows, userRows] = await Promise.all([
        this.db
          .select()
          .from(schema.listingImages)
          .where(inArray(schema.listingImages.listingId, ids))
          .orderBy(asc(schema.listingImages.sortOrder)),
        this.db
          .select({
            id: schema.users.id,
            email: schema.users.email,
            role: schema.users.role,
            kycLevel: schema.users.kycLevel,
            status: schema.users.status,
            createdAt: schema.users.createdAt,
            username: schema.userProfiles.username,
            avatarUrl: schema.userProfiles.avatarUrl,
            bio: schema.userProfiles.bio,
            city: schema.userProfiles.city,
            province: schema.userProfiles.province,
          })
          .from(schema.users)
          .leftJoin(
            schema.userProfiles,
            eq(schema.userProfiles.userId, schema.users.id),
          )
          .where(
            inArray(
              schema.users.id,
              data.map((r) => r.userId),
            ),
          ),
      ]);
      const imagesByListing = new Map<
        string,
        (typeof schema.listingImages.$inferSelect)[]
      >();
      for (const img of imageRows) {
        const arr = imagesByListing.get(img.listingId) ?? [];
        arr.push(img);
        imagesByListing.set(img.listingId, arr);
      }
      const sellersById = new Map(userRows.map((u) => [u.id, u]));
      const dataWithEnrichments = data.map((r) => ({
        ...r,
        images: imagesByListing.get(r.id) ?? [],
        seller: sellersById.get(r.userId) ?? undefined,
      }));
      return { data: dataWithEnrichments, nextCursor, hasMore };
    }

    return { data, nextCursor, hasMore };
  }

  async findOne(
    id: string,
    viewerUserId?: string,
  ): Promise<
    Listing & {
      images: (typeof schema.listingImages.$inferSelect)[];
      seller: Record<string, unknown> | undefined;
    }
  > {
    const [listing] = await this.db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, id))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.status === 'removed' || listing.deletedAt)
      throw new NotFoundException('LISTING_NOT_FOUND');

    const [images, sellerRows] = await Promise.all([
      this.db
        .select()
        .from(schema.listingImages)
        .where(eq(schema.listingImages.listingId, id))
        .orderBy(asc(schema.listingImages.sortOrder)),
      this.db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          role: schema.users.role,
          kycLevel: schema.users.kycLevel,
          status: schema.users.status,
          createdAt: schema.users.createdAt,
          username: schema.userProfiles.username,
          avatarUrl: schema.userProfiles.avatarUrl,
          bio: schema.userProfiles.bio,
          city: schema.userProfiles.city,
          province: schema.userProfiles.province,
        })
        .from(schema.users)
        .leftJoin(
          schema.userProfiles,
          eq(schema.userProfiles.userId, schema.users.id),
        )
        .where(eq(schema.users.id, listing.userId))
        .limit(1),
    ]);

    const seller = sellerRows[0] ?? undefined;

    this.recordView(id, viewerUserId).catch(() => {});

    return { ...listing, images, seller };
  }

  async update(
    id: string,
    userId: string,
    dto: Partial<CreateListingDto>,
  ): Promise<Listing> {
    const [listing] = await this.db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, id))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId !== userId)
      throw new ForbiddenException('LISTING_NOT_OWNED');
    if (['removed', 'sold', 'expired'].includes(listing.status)) {
      throw new BadRequestException('LISTING_NOT_EDITABLE');
    }

    const [updated] = await this.db
      .update(schema.listings)
      .set({
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.price !== undefined && { price: String(dto.price) }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.priceNegotiable !== undefined && {
          priceNegotiable: dto.priceNegotiable,
        }),
        ...(dto.condition && { condition: dto.condition }),
        ...(dto.locationText && { locationText: dto.locationText }),
        ...(dto.city && { city: dto.city }),
        ...(dto.province && { province: dto.province }),
        ...(dto.paymentMethods && { paymentMethods: dto.paymentMethods }),
        ...(dto.shippingOptions && { shippingOptions: dto.shippingOptions }),
        ...(dto.shippingDescription !== undefined && {
          shippingDescription: dto.shippingDescription,
        }),
        ...(dto.collectibleAttributes && {
          collectibleAttributes: dto.collectibleAttributes,
        }),
        ...(dto.saleType && { saleType: dto.saleType }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.desiredPrice !== undefined && {
          desiredPrice: Math.round(dto.desiredPrice * 100),
        }),
        ...(dto.contactInfo !== undefined && { contactInfo: dto.contactInfo }),
        ...(dto.youtubeLiveId !== undefined && {
          youtubeLiveId: dto.youtubeLiveId || null,
        }),
        ...(dto.paymentInfo !== undefined && { paymentInfo: dto.paymentInfo }),
        updatedAt: new Date(),
      })
      .where(eq(schema.listings.id, id))
      .returning();

    return updated;
  }

  async publish(
    id: string,
    userId: string,
    dto: { type?: string; durationDays?: number },
  ): Promise<Listing> {
    const [listing] = await this.db
      .select()
      .from(schema.listings)
      .where(
        and(eq(schema.listings.id, id), eq(schema.listings.userId, userId)),
      )
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');

    const durationDays = dto.durationDays ?? listing.durationDays;
    const publishedAt = new Date();
    const expiresAt = new Date(
      publishedAt.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    // Live listings auto-approve regardless of risk score
    if (listing.saleType === 'live') {
      const [updated] = await this.db
        .update(schema.listings)
        .set({
          ...(dto.type && { type: dto.type as 'standard' | 'premium' }),
          durationDays,
          status: 'active',
          moderationStatus: 'approved',
          riskScore: 0,
          publishedAt,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.listings.id, id))
        .returning();

      return updated;
    }

    // Recalculate risk & moderation status with current listing data
    const recalculatedRisk = this.computeRiskScoreFromListing(listing);
    const recalculatedModeration =
      this.resolveModerationStatus(recalculatedRisk);

    const moderatorApproved = listing.moderationStatus === 'approved';
    const newStatus =
      moderatorApproved || recalculatedModeration === 'approved'
        ? 'active'
        : 'draft';

    const [updated] = await this.db
      .update(schema.listings)
      .set({
        ...(dto.type && {
          type: dto.type as 'standard' | 'premium',
        }),
        durationDays,
        status: newStatus,
        riskScore: recalculatedRisk,
        moderationStatus: recalculatedModeration,
        publishedAt: newStatus === 'active' ? publishedAt : undefined,
        expiresAt: newStatus === 'active' ? expiresAt : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.listings.id, id))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const [listing] = await this.db
      .select({ id: schema.listings.id, userId: schema.listings.userId })
      .from(schema.listings)
      .where(eq(schema.listings.id, id))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId !== userId)
      throw new ForbiddenException('LISTING_NOT_OWNED');

    await this.db
      .update(schema.listings)
      .set({ status: 'removed', deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.listings.id, id));
  }

  async findByUser(
    userId: string,
    cursor?: string,
    limit = DEFAULT_LIMIT,
    status?: string,
    search?: string,
    saleType?: string,
    offset?: number,
    categoryId?: string,
  ): Promise<{
    data: Listing[];
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const pageSize = Math.min(limit, MAX_LIMIT);
    const baseConditions = [eq(schema.listings.userId, userId)];

    if (status) {
      const statuses = status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        baseConditions.push(eq(schema.listings.status, statuses[0] as any));
      } else if (statuses.length > 1) {
        baseConditions.push(inArray(schema.listings.status, statuses as any));
      }
    }

    if (search?.trim()) {
      baseConditions.push(ilike(schema.listings.title, `%${search.trim()}%`));
    }

    if (saleType) {
      baseConditions.push(eq(schema.listings.saleType, saleType));
    }

    if (categoryId) {
      baseConditions.push(eq(schema.listings.categoryId, categoryId));
    }

    // Total count (no cursor/offset)
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.listings)
      .where(and(...baseConditions));
    const total = countResult?.count ?? 0;

    let rows: Listing[];

    if (offset !== undefined) {
      // Page-based: LIMIT / OFFSET
      rows = await this.db
        .select()
        .from(schema.listings)
        .where(and(...baseConditions))
        .orderBy(desc(schema.listings.createdAt), desc(schema.listings.id))
        .limit(pageSize)
        .offset(offset);
    } else {
      // Cursor-based (legacy)
      const conditions = [...baseConditions];
      if (cursor) {
        const { createdAt, id } = decodeCursor(cursor);
        conditions.push(
          or(
            lt(schema.listings.createdAt, createdAt),
            and(
              eq(schema.listings.createdAt, createdAt),
              lt(schema.listings.id, id),
            ),
          )!,
        );
      }
      rows = await this.db
        .select()
        .from(schema.listings)
        .where(and(...conditions))
        .orderBy(desc(schema.listings.createdAt), desc(schema.listings.id))
        .limit(pageSize + 1);
    }

    const useOffset = offset !== undefined;
    const hasMore = useOffset
      ? offset + pageSize < total
      : rows.length > pageSize;
    const data = useOffset ? rows : hasMore ? rows.slice(0, pageSize) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      !useOffset && hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    // Batch-fetch images for all returned listings
    let enriched = data;
    if (data.length > 0) {
      const listingIds = data.map((l) => l.id);
      const allImages = await this.db
        .select()
        .from(schema.listingImages)
        .where(inArray(schema.listingImages.listingId, listingIds))
        .orderBy(asc(schema.listingImages.sortOrder));

      const imageMap = new Map<
        string,
        (typeof schema.listingImages.$inferSelect)[]
      >();
      for (const img of allImages) {
        const arr = imageMap.get(img.listingId) ?? [];
        arr.push(img);
        imageMap.set(img.listingId, arr);
      }

      enriched = data.map((r) => ({
        ...r,
        images: imageMap.get(r.id) ?? [],
      }));
    }

    return { data: enriched, nextCursor, hasMore, total };
  }

  private async chargePublication(
    userId: string,
    type: string,
    isCollectible: boolean,
    saleType?: string,
  ): Promise<{ creditsSpent: number; wasFreeQuota: boolean }> {
    const quota = await this.walletService.getFreeQuota(userId);

    if (quota.remaining > 0) {
      await this.walletService.consumeFreeQuota(userId);
      return { creditsSpent: 0, wasFreeQuota: true };
    }

    if (saleType === 'live') {
      await this.walletService.debit(userId, 1, 'listing_publish');
      return { creditsSpent: 1, wasFreeQuota: false };
    }

    const costKey = isCollectible
      ? 'listing.cost.collectible'
      : type === 'premium'
        ? 'listing.cost.premium'
        : 'listing.cost.standard';

    const cost = await this.configService.getNumber(costKey, 2);

    await this.walletService.debit(userId, cost, 'listing_publish');
    return { creditsSpent: cost, wasFreeQuota: false };
  }

  private computeRiskScore(dto: CreateListingDto): number {
    let score = 0;
    const title = dto.title.toLowerCase();
    const desc = dto.description.toLowerCase();

    const spamWords = [
      'urgente',
      'oferta imperdible',
      'ganga',
      'precio increíble',
    ];
    if (spamWords.some((w) => title.includes(w) || desc.includes(w)))
      score += 20;

    if (dto.price === 0) score += 30;
    if (!dto.city && !dto.province && !dto.locationText) score += 10;

    return Math.min(100, score);
  }

  private computeRiskScoreFromListing(
    listing: typeof schema.listings.$inferSelect,
  ): number {
    let score = 0;
    const title = listing.title.toLowerCase();
    const desc = listing.description.toLowerCase();

    const spamWords = [
      'urgente',
      'oferta imperdible',
      'ganga',
      'precio increíble',
    ];
    if (spamWords.some((w) => title.includes(w) || desc.includes(w)))
      score += 20;

    if (Number(listing.price) === 0) score += 30;
    if (!listing.city && !listing.province && !listing.locationText)
      score += 10;

    return Math.min(100, score);
  }

  private resolveModerationStatus(riskScore: number): string {
    if (riskScore >= LISTING.RISK_SCORE.AUTO_REJECT_MIN) return 'rejected';
    if (riskScore >= LISTING.RISK_SCORE.MANUAL_REVIEW_MIN) return 'pending';
    return 'approved';
  }

  async contactSeller(
    listingId: string,
    userId: string,
    message: string,
  ): Promise<{ conversationId: string }> {
    const [listing] = await this.db
      .select({
        id: schema.listings.id,
        userId: schema.listings.userId,
        status: schema.listings.status,
      })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId === userId)
      throw new BadRequestException('CANNOT_CONTACT_OWN_LISTING');

    const conversation = await this.messagingService.findOrCreateConversation(
      userId,
      listingId,
    );
    await this.messagingService.sendMessage(conversation.id, userId, message);

    await this.db
      .update(schema.listings)
      .set({
        contactsCount: sql`${schema.listings.contactsCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.listings.id, listingId));

    return { conversationId: conversation.id };
  }

  async buyNow(
    listingId: string,
    userId: string,
  ): Promise<{ conversationId: string; orderId: string }> {
    const [listing] = await this.db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId === userId)
      throw new BadRequestException('CANNOT_BUY_OWN_LISTING');
    if (listing.saleType !== 'stock')
      throw new BadRequestException('NOT_A_STOCK_LISTING');
    if (listing.status !== 'active')
      throw new BadRequestException('LISTING_NOT_ACTIVE');
    if (!listing.stock || listing.stock <= 0)
      throw new BadRequestException('OUT_OF_STOCK');

    const [updated] = await this.db
      .update(schema.listings)
      .set({
        stock: sql`${schema.listings.stock} - 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.listings.id, listingId),
          sql`${schema.listings.stock} > 0`,
        ),
      )
      .returning();

    if (!updated || (updated.stock ?? 0) < 0) {
      throw new BadRequestException('OUT_OF_STOCK');
    }

    if (updated.stock === 0) {
      await this.db
        .update(schema.listings)
        .set({ status: 'sold', soldAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.listings.id, listingId));
    }

    const conversation = await this.messagingService.findOrCreateConversation(
      userId,
      listingId,
    );

    // Build message with seller contact info
    let contactMessage = '¡Hola! Quiero comprar este producto.';
    const contactInfo = listing.contactInfo as
      | Record<string, unknown>
      | undefined;
    if (contactInfo?.phone) {
      contactMessage += `\n\n📞 Contacto del vendedor: ${contactInfo.phone}`;
    }
    if (contactInfo?.showWhatsApp && contactInfo?.phone) {
      const waNumber = String(contactInfo.phone).replace(/[^0-9]/g, '');
      contactMessage += `\n💬 WhatsApp: https://wa.me/${waNumber}`;
    }

    await this.messagingService.sendMessage(
      conversation.id,
      userId,
      contactMessage,
    );

    await this.notificationsService
      .send({
        userId: listing.userId,
        channel: 'in_app',
        type: 'item_purchased',
        title: '¡Vendiste un producto!',
        body: `Alguien compró "${listing.title}".`,
        data: { listingId, conversationId: conversation.id },
      })
      .catch(() => {});

    // Resolve payment info (listing override > seller profile defaults)
    const listingPaymentInfo = listing.paymentInfo as Record<
      string,
      unknown
    > | null;
    let resolvedPaymentInfo = listingPaymentInfo;

    if (!resolvedPaymentInfo) {
      const [sellerProfile] = await this.db
        .select({
          cbu: schema.userProfiles.cbu,
          alias: schema.userProfiles.alias,
          bankName: schema.userProfiles.bankName,
          bankAccountType: schema.userProfiles.bankAccountType,
          bankAccountNumber: schema.userProfiles.bankAccountNumber,
        })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, listing.userId))
        .limit(1);

      if (sellerProfile) {
        const profilePayment: Record<string, unknown> = {};
        if (sellerProfile.cbu) profilePayment.cbu = sellerProfile.cbu;
        if (sellerProfile.alias) profilePayment.alias = sellerProfile.alias;
        if (sellerProfile.bankName)
          profilePayment.bankName = sellerProfile.bankName;
        if (sellerProfile.bankAccountType)
          profilePayment.bankAccountType = sellerProfile.bankAccountType;
        if (sellerProfile.bankAccountNumber)
          profilePayment.bankAccountNumber = sellerProfile.bankAccountNumber;
        if (Object.keys(profilePayment).length > 0)
          resolvedPaymentInfo = profilePayment;
      }
    }

    // Create the order
    const order = await this.ordersService.create({
      listingId,
      buyerId: userId,
      sellerId: listing.userId,
      conversationId: conversation.id,
      paymentInfo: resolvedPaymentInfo,
    });

    return { conversationId: conversation.id, orderId: order.id };
  }

  async placeBid(
    listingId: string,
    userId: string,
    dto: PlaceBidDto,
  ): Promise<{
    bid: typeof schema.listingBids.$inferSelect | null;
    instantBuy: boolean;
    conversationId?: string;
  }> {
    const [listing] = await this.db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId === userId)
      throw new BadRequestException('CANNOT_BID_OWN_LISTING');
    if (listing.saleType !== 'auction')
      throw new BadRequestException('NOT_AN_AUCTION');
    if (listing.status !== 'active')
      throw new BadRequestException('LISTING_NOT_ACTIVE');

    const amountCents = Math.round(dto.amount * 100);
    const basePriceCents = Math.round(Number(listing.price) * 100);
    const desiredCents = listing.desiredPrice ?? Infinity;

    if (amountCents < basePriceCents) {
      throw new BadRequestException('BID_BELOW_BASE_PRICE');
    }

    // Instant buy if bid >= desired price
    if (amountCents >= desiredCents) {
      await this.db
        .update(schema.listings)
        .set({ status: 'sold', soldAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.listings.id, listingId));

      const [bid] = await this.db
        .insert(schema.listingBids)
        .values({
          listingId,
          bidderId: userId,
          amount: amountCents,
          status: 'won',
        })
        .returning();

      await this.db
        .update(schema.listingBids)
        .set({ status: 'lost' })
        .where(
          and(
            eq(schema.listingBids.listingId, listingId),
            eq(schema.listingBids.status, 'active'),
            ne(schema.listingBids.bidderId, userId),
          ),
        );

      const conversation = await this.messagingService.findOrCreateConversation(
        userId,
        listingId,
      );
      await this.messagingService.sendMessage(
        conversation.id,
        userId,
        '¡Compré este producto al precio deseado!',
      );

      await this.notificationsService.send({
        userId: listing.userId,
        channel: 'in_app',
        type: 'auction_won',
        title: '¡Subasta finalizada!',
        body: `"${listing.title}" se vendió al precio deseado.`,
        data: { listingId, conversationId: conversation.id },
      });

      return { bid, instantBuy: true, conversationId: conversation.id };
    }

    // Regular bid — use transaction for atomicity
    return this.db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(schema.listings)
        .where(eq(schema.listings.id, listingId));

      if (!locked || locked.status !== 'active')
        throw new BadRequestException('LISTING_NOT_ACTIVE');

      const [highestBid] = await tx
        .select()
        .from(schema.listingBids)
        .where(
          and(
            eq(schema.listingBids.listingId, listingId),
            eq(schema.listingBids.status, 'active'),
          ),
        )
        .orderBy(desc(schema.listingBids.amount))
        .limit(1);

      if (highestBid && amountCents <= highestBid.amount) {
        throw new BadRequestException('BID_TOO_LOW');
      }

      await tx
        .update(schema.listingBids)
        .set({ status: 'outbid' })
        .where(
          and(
            eq(schema.listingBids.listingId, listingId),
            eq(schema.listingBids.status, 'active'),
            ne(schema.listingBids.bidderId, userId),
          ),
        );

      const [bid] = await tx
        .insert(schema.listingBids)
        .values({
          listingId,
          bidderId: userId,
          amount: amountCents,
          status: 'active',
        })
        .returning();

      if (highestBid && highestBid.bidderId !== userId) {
        await this.notificationsService.send({
          userId: highestBid.bidderId,
          channel: 'in_app',
          type: 'outbid',
          title: 'Te superaron la oferta',
          body: `Alguien ofreció más en "${locked.title}".`,
          data: { listingId, bidId: bid.id },
        });
      }

      return { bid, instantBuy: false };
    });
  }

  async getBids(listingId: string) {
    return this.db
      .select()
      .from(schema.listingBids)
      .where(eq(schema.listingBids.listingId, listingId))
      .orderBy(desc(schema.listingBids.amount));
  }

  async askQuestion(listingId: string, userId: string, question: string) {
    const listing = await this.db
      .select({ userId: schema.listings.userId, title: schema.listings.title })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .then((rows) => rows[0]);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId === userId)
      throw new BadRequestException('CANNOT_ASK_OWN_LISTING');

    const [qa] = await this.db
      .insert(schema.listingQuestions)
      .values({ listingId, userId, question })
      .returning();

    const previewBody = question.substring(0, 200);
    const notifData = {
      listingId,
      questionId: qa.id,
      url: `/listing/${listingId}`,
    };

    await this.notificationsService.send({
      userId: listing.userId,
      channel: 'in_app',
      type: 'listing_question',
      title: 'Nueva pregunta en tu publicación',
      body: previewBody,
      data: notifData,
    });

    await this.notificationsService.send({
      userId: listing.userId,
      channel: 'push',
      type: 'listing_question',
      title: `Pregunta en "${listing.title}"`,
      body: previewBody,
      data: notifData,
    });

    return qa;
  }

  async answerQuestion(
    listingId: string,
    questionId: string,
    userId: string,
    answer: string,
  ) {
    const listing = await this.db
      .select({ userId: schema.listings.userId })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .then((rows) => rows[0]);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId !== userId)
      throw new ForbiddenException('NOT_LISTING_OWNER');

    const [qa] = await this.db
      .update(schema.listingQuestions)
      .set({ answer, answeredAt: new Date() })
      .where(
        and(
          eq(schema.listingQuestions.id, questionId),
          eq(schema.listingQuestions.listingId, listingId),
        ),
      )
      .returning();

    if (!qa) throw new NotFoundException('QUESTION_NOT_FOUND');
    return qa;
  }

  async getQuestions(listingId: string, requesterUserId?: string) {
    const [listing] = await this.db
      .select({ userId: schema.listings.userId })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);
    if (!listing) return [];

    const isSeller = !!requesterUserId && requesterUserId === listing.userId;

    const rows = await this.db
      .select({
        id: schema.listingQuestions.id,
        listingId: schema.listingQuestions.listingId,
        userId: schema.listingQuestions.userId,
        question: schema.listingQuestions.question,
        answer: schema.listingQuestions.answer,
        answeredAt: schema.listingQuestions.answeredAt,
        isPrivate: schema.listingQuestions.isPrivate,
        createdAt: schema.listingQuestions.createdAt,
        askerUsername: schema.userProfiles.username,
      })
      .from(schema.listingQuestions)
      .leftJoin(
        schema.userProfiles,
        eq(schema.userProfiles.userId, schema.listingQuestions.userId),
      )
      .where(eq(schema.listingQuestions.listingId, listingId))
      .orderBy(desc(schema.listingQuestions.createdAt));

    // Non-seller viewers (and the asker themselves) should not see questions
    // the seller marked as private — except the asker still sees their own.
    return rows.filter((q) => {
      if (!q.isPrivate) return true;
      if (isSeller) return true;
      return q.userId === requesterUserId;
    });
  }

  /** All unanswered questions across every listing owned by `sellerUserId`,
   *  joined with the listing title and the asker username so the inbox can
   *  render without a second roundtrip. */
  async getPendingQuestionsForSeller(sellerUserId: string) {
    return this.db
      .select({
        id: schema.listingQuestions.id,
        listingId: schema.listingQuestions.listingId,
        listingTitle: schema.listings.title,
        question: schema.listingQuestions.question,
        isPrivate: schema.listingQuestions.isPrivate,
        createdAt: schema.listingQuestions.createdAt,
        askerUserId: schema.listingQuestions.userId,
        askerUsername: schema.userProfiles.username,
      })
      .from(schema.listingQuestions)
      .innerJoin(
        schema.listings,
        eq(schema.listings.id, schema.listingQuestions.listingId),
      )
      .leftJoin(
        schema.userProfiles,
        eq(schema.userProfiles.userId, schema.listingQuestions.userId),
      )
      .where(
        and(
          eq(schema.listings.userId, sellerUserId),
          isNull(schema.listingQuestions.answer),
        ),
      )
      .orderBy(desc(schema.listingQuestions.createdAt));
  }

  async setQuestionPrivacy(
    listingId: string,
    questionId: string,
    sellerUserId: string,
    isPrivate: boolean,
  ) {
    const [listing] = await this.db
      .select({ userId: schema.listings.userId })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId !== sellerUserId)
      throw new ForbiddenException('NOT_LISTING_OWNER');

    const [qa] = await this.db
      .update(schema.listingQuestions)
      .set({ isPrivate })
      .where(
        and(
          eq(schema.listingQuestions.id, questionId),
          eq(schema.listingQuestions.listingId, listingId),
        ),
      )
      .returning();

    if (!qa) throw new NotFoundException('QUESTION_NOT_FOUND');
    return qa;
  }

  private async recordView(
    listingId: string,
    viewerUserId?: string,
  ): Promise<void> {
    await this.db.insert(schema.listingViews).values({
      listingId,
      viewerUserId,
    });
    await this.db
      .update(schema.listings)
      .set({ viewsCount: sql`${schema.listings.viewsCount} + 1` })
      .where(eq(schema.listings.id, listingId));
  }

  // ─── Bulk operations (Mi Tienda) ─────────────────────────────────────────

  async bulkUpdateStatus(
    userId: string,
    ids: string[],
    target: 'paused' | 'active',
  ) {
    if (ids.length === 0) return { updated: 0, skipped: 0, target };
    type ListingStatus = NonNullable<
      (typeof schema.listings.$inferInsert)['status']
    >;
    const allowedFromStatuses: ListingStatus[] =
      target === 'paused' ? ['active'] : ['paused'];

    const result = await this.db
      .update(schema.listings)
      .set({
        status: target,
        publishedAt: target === 'active' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.listings.userId, userId),
          inArray(schema.listings.id, ids),
          inArray(schema.listings.status, allowedFromStatuses),
          isNull(schema.listings.deletedAt),
        ),
      )
      .returning({ id: schema.listings.id });

    return {
      updated: result.length,
      skipped: ids.length - result.length,
      target,
    };
  }

  async bulkAdjustPrice(
    userId: string,
    ids: string[],
    mode: 'percent' | 'absolute',
    value: number,
  ) {
    if (ids.length === 0) return { updated: 0, items: [] };
    if (!Number.isFinite(value)) {
      throw new BadRequestException('value must be a finite number');
    }
    if (mode === 'percent' && (value <= -100 || value > 1000)) {
      throw new BadRequestException('percent must be > -100 and <= 1000');
    }
    if (mode === 'absolute' && value < 1) {
      throw new BadRequestException('absolute price must be >= 1');
    }

    const current = await this.db
      .select({
        id: schema.listings.id,
        title: schema.listings.title,
        price: schema.listings.price,
        currency: schema.listings.currency,
      })
      .from(schema.listings)
      .where(
        and(
          eq(schema.listings.userId, userId),
          inArray(schema.listings.id, ids),
          isNull(schema.listings.deletedAt),
        ),
      );

    const updates: Array<{
      id: string;
      title: string;
      oldPrice: number;
      newPrice: number;
      currency: string;
    }> = [];

    for (const row of current) {
      const oldPrice = Number(row.price);
      let newPrice = mode === 'percent' ? oldPrice * (1 + value / 100) : value;
      newPrice = Math.max(1, Math.round(newPrice * 100) / 100);
      updates.push({
        id: row.id,
        title: row.title,
        oldPrice,
        newPrice,
        currency: row.currency,
      });
    }

    await this.db.transaction(async (tx) => {
      for (const u of updates) {
        await tx
          .update(schema.listings)
          .set({ price: String(u.newPrice), updatedAt: new Date() })
          .where(eq(schema.listings.id, u.id));
      }
    });

    return { updated: updates.length, items: updates };
  }

  async exportCsvForUser(userId: string): Promise<string> {
    const rows = await this.db
      .select({
        id: schema.listings.id,
        title: schema.listings.title,
        price: schema.listings.price,
        currency: schema.listings.currency,
        status: schema.listings.status,
        condition: schema.listings.condition,
        saleType: schema.listings.saleType,
        stock: schema.listings.stock,
        agentPurchasable: schema.listings.agentPurchasable,
        city: schema.listings.city,
        province: schema.listings.province,
        createdAt: schema.listings.createdAt,
        publishedAt: schema.listings.publishedAt,
        expiresAt: schema.listings.expiresAt,
        categoryName: schema.categories.name,
      })
      .from(schema.listings)
      .leftJoin(
        schema.categories,
        eq(schema.listings.categoryId, schema.categories.id),
      )
      .where(
        and(
          eq(schema.listings.userId, userId),
          isNull(schema.listings.deletedAt),
        ),
      )
      .orderBy(desc(schema.listings.createdAt));

    const header = [
      'id',
      'title',
      'price',
      'currency',
      'status',
      'condition',
      'sale_type',
      'stock',
      'agent_purchasable',
      'category',
      'city',
      'province',
      'created_at',
      'published_at',
      'expires_at',
    ].join(',');

    const escape = (v: string | number | boolean | Date | null | undefined) => {
      if (v == null) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      const needsQuoting = /[",\n\r]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuoting ? `"${escaped}"` : escaped;
    };

    const lines = rows.map((r) =>
      [
        r.id,
        r.title,
        r.price,
        r.currency,
        r.status,
        r.condition,
        r.saleType,
        r.stock ?? '',
        r.agentPurchasable,
        r.categoryName ?? '',
        r.city ?? '',
        r.province ?? '',
        r.createdAt,
        r.publishedAt,
        r.expiresAt,
      ]
        .map(escape)
        .join(','),
    );

    return [header, ...lines].join('\n');
  }
}
