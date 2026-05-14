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
  or,
  ne,
  sql,
  gte,
  lte,
  inArray,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { ConfigService } from '../config/config.service';
import { WalletService } from '../wallet/wallet.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
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
        desiredPrice:
          dto.desiredPrice !== undefined
            ? Math.round(dto.desiredPrice * 100)
            : undefined,
      })
      .returning();

    return listing;
  }

  async findAll(dto: ListListingsDto): Promise<{
    data: Listing[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const limit = Math.min(dto.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const fetchCount = limit + 1;

    const conditions = [
      eq(schema.listings.status, 'active'),
      eq(schema.listings.moderationStatus, 'approved' as string),
    ];

    if (dto.categoryId)
      conditions.push(eq(schema.listings.categoryId, dto.categoryId));
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

    if (dto.cursor) {
      const { createdAt, id } = decodeCursor(dto.cursor);
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

    const orderBy =
      dto.sort === 'price_asc'
        ? [asc(schema.listings.price), desc(schema.listings.createdAt)]
        : dto.sort === 'price_desc'
          ? [desc(schema.listings.price), desc(schema.listings.createdAt)]
          : [desc(schema.listings.createdAt), desc(schema.listings.id)];

    const rows = await this.db
      .select()
      .from(schema.listings)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(fetchCount);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
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

    // Recalculate risk & moderation status with current listing data
    const recalculatedRisk = this.computeRiskScoreFromListing(listing);
    const recalculatedModeration =
      this.resolveModerationStatus(recalculatedRisk);

    const durationDays = dto.durationDays ?? listing.durationDays;
    const publishedAt = new Date();
    const expiresAt = new Date(
      publishedAt.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );
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
  ): Promise<{
    data: Listing[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const pageSize = Math.min(limit, MAX_LIMIT);
    const fetchCount = pageSize + 1;
    const conditions = [eq(schema.listings.userId, userId)];

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

    const rows = await this.db
      .select()
      .from(schema.listings)
      .where(and(...conditions))
      .orderBy(desc(schema.listings.createdAt), desc(schema.listings.id))
      .limit(fetchCount);

    const hasMore = rows.length > pageSize;
    const data = hasMore ? rows.slice(0, pageSize) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { data, nextCursor, hasMore };
  }

  private async chargePublication(
    userId: string,
    type: string,
    isCollectible: boolean,
  ): Promise<{ creditsSpent: number; wasFreeQuota: boolean }> {
    const quota = await this.walletService.getFreeQuota(userId);

    if (quota.remaining > 0) {
      await this.walletService.consumeFreeQuota(userId);
      return { creditsSpent: 0, wasFreeQuota: true };
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
  ): Promise<{ conversationId: string }> {
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
    await this.messagingService.sendMessage(
      conversation.id,
      userId,
      '¡Hola! Quiero comprar este producto.',
    );

    await this.notificationsService.send({
      userId: listing.userId,
      channel: 'in_app',
      type: 'item_purchased',
      title: '¡Vendiste un producto!',
      body: `Alguien compró "${listing.title}".`,
      data: { listingId, conversationId: conversation.id },
    });

    return { conversationId: conversation.id };
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
}
