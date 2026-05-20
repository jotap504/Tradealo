import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  eq,
  desc,
  and,
  gte,
  lt,
  ilike,
  asc,
  sql,
  or,
  count,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { AdminConfigService } from '../config/admin-config.service';
import * as schema from '../database/schema';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly adminConfigService: AdminConfigService,
  ) {}

  // ─── Dashboard / Stats ───────────────────────────────────────────────────────

  async getDashboardStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

    const [
      [totalUsers],
      [recentUsers],
      [activeListings],
      [pendingListings],
      [pendingKyc],
    ] = await Promise.all([
      this.db.select({ n: count() }).from(schema.users),
      this.db
        .select({ n: count() })
        .from(schema.users)
        .where(gte(schema.users.createdAt, thirtyDaysAgo)),
      this.db
        .select({ n: count() })
        .from(schema.listings)
        .where(eq(schema.listings.status, 'active')),
      this.db
        .select({ n: count() })
        .from(schema.listings)
        .where(eq(schema.listings.moderationStatus, 'pending')),
      this.db
        .select({ n: count() })
        .from(schema.userVerifications)
        .where(eq(schema.userVerifications.status, 'pending')),
    ]);

    return {
      users: { total: totalUsers.n, lastThirtyDays: recentUsers.n },
      listings: {
        active: activeListings.n,
        pendingModeration: pendingListings.n,
      },
      kyc: { pending: pendingKyc.n },
    };
  }

  async getStats() {
    return this.getDashboardStats();
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  async listUsers(
    params: {
      cursor?: string;
      role?: string;
      kycLevel?: number;
      status?: string;
      search?: string;
      limit?: number;
    } = {},
  ) {
    const limit = Math.min(params.limit ?? 50, 100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];

    if (params.role) {
      conditions.push(
        eq(
          schema.users.role,
          params.role as (typeof schema.users.$inferSelect)['role'],
        ),
      );
    }
    if (params.kycLevel !== undefined) {
      conditions.push(eq(schema.users.kycLevel, params.kycLevel));
    }
    if (params.status) {
      conditions.push(
        eq(
          schema.users.status,
          params.status as (typeof schema.users.$inferSelect)['status'],
        ),
      );
    }
    if (params.search) {
      conditions.push(ilike(schema.users.email, `%${params.search}%`));
    }
    if (params.cursor) {
      const { createdAt, id } = decodeCursor(params.cursor);
      conditions.push(
        or(
          lt(schema.users.createdAt, createdAt),
          and(eq(schema.users.createdAt, createdAt), lt(schema.users.id, id)),
        ),
      );
    }

    const rows = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
        status: schema.users.status,
        kycLevel: schema.users.kycLevel,
        emailVerified: schema.users.emailVerified,
        createdAt: schema.users.createdAt,
        lastLoginAt: schema.users.lastLoginAt,
      })
      .from(schema.users)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.users.createdAt), desc(schema.users.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit);
    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: data[data.length - 1].createdAt,
          id: data[data.length - 1].id,
        })
      : null;

    return { data, nextCursor, hasMore };
  }

  async getUser(userId: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const [profile, wallet, verifications] = await Promise.all([
      this.db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1),
      this.db
        .select()
        .from(schema.wallets)
        .where(eq(schema.wallets.userId, userId))
        .limit(1),
      this.db
        .select()
        .from(schema.userVerifications)
        .where(eq(schema.userVerifications.userId, userId))
        .orderBy(desc(schema.userVerifications.createdAt)),
    ]);

    const { passwordHash: _ph, twoFactorSecret: _tfs, ...safeUser } = user;
    return {
      ...safeUser,
      profile: profile[0] ?? null,
      wallet: wallet[0] ?? null,
      verifications,
    };
  }

  async updateUserRole(targetUserId: string, role: string, adminId: string) {
    const validRoles = [
      'user',
      'verified_user',
      'moderator',
      'support',
      'finance',
      'partner',
      'super_admin',
    ];
    if (!validRoles.includes(role))
      throw new BadRequestException('INVALID_ROLE');

    const [user] = await this.db
      .select({ id: schema.users.id, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const [updated] = await this.db
      .update(schema.users)
      .set({
        role: role as (typeof schema.users.$inferInsert)['role'],
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, targetUserId))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      });

    await this.logAudit(
      adminId,
      'user.role_change',
      'user',
      targetUserId,
      { role: user.role },
      { role },
    );

    return updated;
  }

  async suspendUser(targetUserId: string, adminId: string, days?: number) {
    const [user] = await this.db
      .select({ id: schema.users.id, status: schema.users.status })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.status === 'banned')
      throw new BadRequestException('USER_IS_BANNED');

    const suspendedUntil = days
      ? new Date(Date.now() + days * 86400_000)
      : null;

    const [updated] = await this.db
      .update(schema.users)
      .set({ status: 'suspended', suspendedUntil, updatedAt: new Date() })
      .where(eq(schema.users.id, targetUserId))
      .returning({
        id: schema.users.id,
        status: schema.users.status,
        suspendedUntil: schema.users.suspendedUntil,
      });

    await this.logAudit(
      adminId,
      'user.suspend',
      'user',
      targetUserId,
      { status: user.status },
      { status: 'suspended', days: days ?? 'permanent' },
    );

    return updated;
  }

  async banUser(targetUserId: string, adminId: string) {
    const [user] = await this.db
      .select({ id: schema.users.id, status: schema.users.status })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.status === 'banned')
      throw new BadRequestException('USER_ALREADY_BANNED');

    await this.db
      .update(schema.users)
      .set({ status: 'banned', suspendedUntil: null, updatedAt: new Date() })
      .where(eq(schema.users.id, targetUserId));

    await this.logAudit(
      adminId,
      'user.ban',
      'user',
      targetUserId,
      { status: user.status },
      { status: 'banned' },
    );

    return { id: targetUserId, status: 'banned' };
  }

  async restoreUser(targetUserId: string, adminId: string) {
    const [user] = await this.db
      .select({ id: schema.users.id, status: schema.users.status })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.status === 'active')
      throw new BadRequestException('USER_ALREADY_ACTIVE');

    const [updated] = await this.db
      .update(schema.users)
      .set({ status: 'active', suspendedUntil: null, updatedAt: new Date() })
      .where(eq(schema.users.id, targetUserId))
      .returning({ id: schema.users.id, status: schema.users.status });

    await this.logAudit(
      adminId,
      'user.restore',
      'user',
      targetUserId,
      { status: user.status },
      { status: 'active' },
    );

    return updated;
  }

  async deleteUser(targetUserId: string, adminId: string) {
    const [user] = await this.db
      .select({ id: schema.users.id, status: schema.users.status })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.status === 'deleted')
      throw new BadRequestException('USER_ALREADY_DELETED');

    await this.db
      .update(schema.users)
      .set({ status: 'deleted', deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, targetUserId));

    await this.logAudit(
      adminId,
      'user.delete',
      'user',
      targetUserId,
      { status: user.status },
      { status: 'deleted' },
    );

    return { id: targetUserId, status: 'deleted' };
  }

  async setKycLevel(targetUserId: string, level: number, adminId: string) {
    if (![0, 1, 2].includes(level))
      throw new BadRequestException('INVALID_KYC_LEVEL');

    const [user] = await this.db
      .select({ id: schema.users.id, kycLevel: schema.users.kycLevel })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const set: Record<string, unknown> = {
      kycLevel: level,
      updatedAt: new Date(),
    };
    if (level >= 1 && !user.kycLevel) set.silverGrantedAt = new Date();
    if (level >= 2) set.goldGrantedAt = new Date();

    const [updated] = await this.db
      .update(schema.users)
      .set(
        set as Parameters<typeof this.db.update>[0] extends never ? never : any,
      )
      .where(eq(schema.users.id, targetUserId))
      .returning({ id: schema.users.id, kycLevel: schema.users.kycLevel });

    await this.logAudit(
      adminId,
      'kyc.level_change',
      'user',
      targetUserId,
      { kycLevel: user.kycLevel },
      { kycLevel: level },
    );

    return updated;
  }

  async adjustTokens(
    targetUserId: string,
    amount: number,
    reason: string,
    adminId: string,
  ) {
    if (amount === 0) throw new BadRequestException('Amount cannot be zero');
    if (!reason?.trim()) throw new BadRequestException('Reason is required');

    const [user] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const result = await this.db.transaction(async (tx) => {
      const updated =
        amount >= 0
          ? await tx
              .update(schema.wallets)
              .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
              .where(eq(schema.wallets.userId, targetUserId))
              .returning({ balance: schema.wallets.balance })
          : await tx
              .update(schema.wallets)
              .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
              .where(
                and(
                  eq(schema.wallets.userId, targetUserId),
                  gte(schema.wallets.balance, -amount),
                ),
              )
              .returning({ balance: schema.wallets.balance });

      if (!updated.length) {
        throw amount < 0
          ? new BadRequestException('Insufficient balance')
          : new NotFoundException('WALLET_NOT_FOUND');
      }

      const [txn] = await tx
        .insert(schema.creditTransactions)
        .values({
          userId: targetUserId,
          amount,
          balanceAfter: updated[0].balance,
          reason: 'admin_adjustment',
        })
        .returning();

      return txn;
    });

    await this.logAudit(
      adminId,
      'user.token_adjust',
      'user',
      targetUserId,
      null,
      { amount, reason },
    );

    return result;
  }

  // ─── Configs ─────────────────────────────────────────────────────────────────

  async getConfigs() {
    return this.adminConfigService.getAll();
  }

  async updateConfig(
    key: string,
    value: unknown,
    changeReason: string,
    adminId: string,
  ) {
    const updated = await this.adminConfigService.update(
      key,
      value,
      adminId,
      changeReason,
    );
    await this.logAudit(
      adminId,
      'config.update',
      'config',
      undefined,
      undefined,
      {
        key,
        value,
      },
    );
    return updated;
  }

  // ─── Token Packs ─────────────────────────────────────────────────────────────

  async createTokenPack(
    data: {
      key: string;
      label: string;
      tokens: number;
      bonusPct?: number;
      isFeatured?: boolean;
      sortOrder?: number;
      priceArs: string;
    },
    adminId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [pack] = await tx
        .insert(schema.tokenPackDefinitions)
        .values({
          key: data.key,
          label: data.label,
          tokens: data.tokens,
          bonusPct: data.bonusPct ?? 0,
          isFeatured: data.isFeatured ?? false,
          sortOrder: data.sortOrder ?? 0,
          isActive: true,
        })
        .returning();

      const [price] = await tx
        .insert(schema.tokenPackPrices)
        .values({
          packId: pack.id,
          countryCode: 'AR',
          price: data.priceArs,
          currencyCode: 'ARS',
          updatedBy: adminId,
        })
        .returning();

      await this.logAudit(
        adminId,
        'token_pack.create',
        'token_pack',
        pack.id,
        undefined,
        data,
      );

      return { ...pack, prices: [price] };
    });
  }

  async getTokenPacks() {
    const [packs, prices] = await Promise.all([
      this.db
        .select()
        .from(schema.tokenPackDefinitions)
        .orderBy(asc(schema.tokenPackDefinitions.sortOrder)),
      this.db.select().from(schema.tokenPackPrices),
    ]);

    return packs.map((pack) => ({
      ...pack,
      prices: prices.filter((p) => p.packId === pack.id),
    }));
  }

  async updateTokenPack(
    packId: string,
    data: {
      label?: string;
      tokens?: number;
      bonusPct?: number;
      isFeatured?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    },
    adminId: string,
  ) {
    const [pack] = await this.db
      .select()
      .from(schema.tokenPackDefinitions)
      .where(eq(schema.tokenPackDefinitions.id, packId))
      .limit(1);

    if (!pack) throw new NotFoundException('TOKEN_PACK_NOT_FOUND');

    const [updated] = await this.db
      .update(schema.tokenPackDefinitions)
      .set(data)
      .where(eq(schema.tokenPackDefinitions.id, packId))
      .returning();

    await this.logAudit(
      adminId,
      'token_pack.update',
      'token_pack',
      packId,
      pack,
      data,
    );
    return updated;
  }

  async updateTokenPackPrice(priceId: string, price: string, adminId: string) {
    const [priceRow] = await this.db
      .select()
      .from(schema.tokenPackPrices)
      .where(eq(schema.tokenPackPrices.id, priceId))
      .limit(1);

    if (!priceRow) throw new NotFoundException('PRICE_NOT_FOUND');

    const [updated] = await this.db
      .update(schema.tokenPackPrices)
      .set({ price, updatedBy: adminId, updatedAt: new Date() })
      .where(eq(schema.tokenPackPrices.id, priceId))
      .returning();

    await this.logAudit(
      adminId,
      'token_pack.price_update',
      'token_pack_price',
      priceId,
      { price: priceRow.price },
      { price },
    );
    return updated;
  }

  // ─── KYC (admin) ─────────────────────────────────────────────────────────────

  async listKycPending(type?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [eq(schema.userVerifications.status, 'pending')];
    if (type) {
      conditions.push(
        eq(
          schema.userVerifications.type,
          type as (typeof schema.userVerifications.$inferSelect)['type'],
        ),
      );
    }

    return this.db
      .select()
      .from(schema.userVerifications)
      .where(and(...conditions))
      .orderBy(desc(schema.userVerifications.createdAt))
      .limit(100);
  }

  async approveKyc(verificationId: string, adminId: string) {
    const [verification] = await this.db
      .select()
      .from(schema.userVerifications)
      .where(eq(schema.userVerifications.id, verificationId))
      .limit(1);

    if (!verification) throw new NotFoundException('VERIFICATION_NOT_FOUND');
    if (verification.status !== 'pending')
      throw new BadRequestException('VERIFICATION_NOT_PENDING');

    await this.db
      .update(schema.userVerifications)
      .set({ status: 'approved', verifiedAt: new Date(), verifiedBy: adminId })
      .where(eq(schema.userVerifications.id, verificationId));

    // Upgrade kycLevel: selfie/phone_camera/dni → Silver (1); address/bcra_consent → Gold (2)
    const silverTypes = ['selfie', 'phone_camera', 'dni'];
    const goldTypes = ['address', 'bcra_consent'];
    const [user] = await this.db
      .select({ kycLevel: schema.users.kycLevel })
      .from(schema.users)
      .where(eq(schema.users.id, verification.userId))
      .limit(1);
    if (user) {
      if (silverTypes.includes(verification.type) && user.kycLevel < 1) {
        await this.db
          .update(schema.users)
          .set({
            kycLevel: 1,
            silverGrantedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, verification.userId));
      } else if (goldTypes.includes(verification.type) && user.kycLevel < 2) {
        await this.db
          .update(schema.users)
          .set({
            kycLevel: 2,
            goldGrantedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, verification.userId));
      }
    }

    await this.logAudit(
      adminId,
      'kyc.approve',
      'kyc',
      verificationId,
      { status: 'pending' },
      { status: 'approved', type: verification.type },
    );

    return { verificationId, status: 'approved', userId: verification.userId };
  }

  async rejectKyc(verificationId: string, reason: string, adminId: string) {
    const [verification] = await this.db
      .select()
      .from(schema.userVerifications)
      .where(eq(schema.userVerifications.id, verificationId))
      .limit(1);

    if (!verification) throw new NotFoundException('VERIFICATION_NOT_FOUND');
    if (verification.status !== 'pending')
      throw new BadRequestException('VERIFICATION_NOT_PENDING');

    await this.db
      .update(schema.userVerifications)
      .set({ status: 'rejected', rejectionReason: reason })
      .where(eq(schema.userVerifications.id, verificationId));

    await this.logAudit(
      adminId,
      'kyc.reject',
      'kyc',
      verificationId,
      { status: 'pending' },
      { status: 'rejected', reason },
    );

    return { verificationId, status: 'rejected', userId: verification.userId };
  }

  // ─── Listings (admin) ────────────────────────────────────────────────────────

  async listFlaggedListings(limit = 50) {
    return this.db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.moderationStatus, 'flagged'))
      .orderBy(desc(schema.listings.updatedAt))
      .limit(Math.min(limit, 100));
  }

  async listModerationListings(cursor?: string) {
    const limit = 50;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [eq(schema.listings.moderationStatus, 'pending')];

    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      conditions.push(
        or(
          lt(schema.listings.createdAt, createdAt),
          and(
            eq(schema.listings.createdAt, createdAt),
            lt(schema.listings.id, id),
          ),
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(schema.listings)
      .where(and(...conditions))
      .orderBy(desc(schema.listings.riskScore), desc(schema.listings.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit);
    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: data[data.length - 1].createdAt!,
          id: data[data.length - 1].id,
        })
      : null;

    return { data, nextCursor, hasMore };
  }

  async approveListing(listingId: string, adminId: string) {
    const [listing] = await this.db
      .select({
        id: schema.listings.id,
        userId: schema.listings.userId,
        title: schema.listings.title,
        moderationStatus: schema.listings.moderationStatus,
        durationDays: schema.listings.durationDays,
      })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.moderationStatus !== 'pending')
      throw new BadRequestException('LISTING_NOT_PENDING');

    const publishedAt = new Date();
    const expiresAt = new Date(
      publishedAt.getTime() + (listing.durationDays ?? 30) * 86400_000,
    );

    const [updated] = await this.db
      .update(schema.listings)
      .set({
        moderationStatus: 'approved',
        status: 'active',
        publishedAt,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.listings.id, listingId))
      .returning();

    await this.logAudit(
      adminId,
      'listing.approve',
      'listing',
      listingId,
      { moderationStatus: 'pending' },
      { moderationStatus: 'approved' },
    );

    this.sendNotification(
      listing.userId,
      'listing_approved',
      '¡Publicación aprobada!',
      `Tu publicación "${listing.title}" fue aprobada y ya está visible.`,
    ).catch(() => null);

    return updated;
  }

  async rejectListing(listingId: string, reason: string, adminId: string) {
    const [listing] = await this.db
      .select({
        id: schema.listings.id,
        userId: schema.listings.userId,
        title: schema.listings.title,
        moderationStatus: schema.listings.moderationStatus,
      })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.moderationStatus !== 'pending')
      throw new BadRequestException('LISTING_NOT_PENDING');

    const [updated] = await this.db
      .update(schema.listings)
      .set({
        moderationStatus: 'rejected',
        status: 'draft',
        updatedAt: new Date(),
      })
      .where(eq(schema.listings.id, listingId))
      .returning();

    await this.logAudit(
      adminId,
      'listing.reject',
      'listing',
      listingId,
      { moderationStatus: 'pending' },
      { moderationStatus: 'rejected', reason },
    );

    this.sendNotification(
      listing.userId,
      'listing_rejected',
      'Publicación rechazada',
      `Tu publicación "${listing.title}" fue rechazada. Motivo: ${reason}`,
    ).catch(() => null);

    return updated;
  }

  // ─── Audit Log ───────────────────────────────────────────────────────────────

  async getAuditLog(
    params: {
      entityType?: string;
      adminId?: string;
      from?: string;
      to?: string;
      cursor?: string;
      limit?: number;
    } = {},
  ) {
    const limit = Math.min(params.limit ?? 50, 100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];

    if (params.entityType)
      conditions.push(eq(schema.adminAuditLog.entityType, params.entityType));
    if (params.adminId)
      conditions.push(eq(schema.adminAuditLog.adminId, params.adminId));
    if (params.from)
      conditions.push(
        gte(schema.adminAuditLog.createdAt, new Date(params.from)),
      );
    if (params.to)
      conditions.push(lt(schema.adminAuditLog.createdAt, new Date(params.to)));
    if (params.cursor) {
      const { createdAt, id } = decodeCursor(params.cursor);
      conditions.push(
        or(
          lt(schema.adminAuditLog.createdAt, createdAt),
          and(
            eq(schema.adminAuditLog.createdAt, createdAt),
            lt(schema.adminAuditLog.id, id),
          ),
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(schema.adminAuditLog)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.adminAuditLog.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit);
    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: data[data.length - 1].createdAt,
          id: data[data.length - 1].id,
        })
      : null;

    return { data, nextCursor, hasMore };
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async sendNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
  ) {
    await this.db.insert(schema.notifications).values({
      userId,
      channel: 'in_app',
      type,
      title,
      body,
      status: 'pending',
    });
  }

  private async logAudit(
    adminId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    oldValue?: unknown,
    newValue?: unknown,
  ) {
    try {
      await this.db.insert(schema.adminAuditLog).values({
        adminId,
        action,
        entityType,
        entityId,
        ...(oldValue != null
          ? { oldValue: oldValue as Record<string, unknown> }
          : {}),
        ...(newValue != null
          ? { newValue: newValue as Record<string, unknown> }
          : {}),
      });
    } catch {
      /* audit failures are non-fatal */
    }
  }
}
