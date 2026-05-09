import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { eq, and, or, lt, desc, asc, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { ConfigService } from '../config/config.service';
import * as schema from '../database/schema';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.util';

type DB = NodePgDatabase<typeof schema>;
type CreditReason = (typeof schema.creditTransactions.$inferInsert)['reason'];

export interface WalletBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: Date;
}

export interface CreditTxResult {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId: string | null;
  referenceType: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface PaginatedTransactions {
  data: CreditTxResult[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface TokenPackWithPrice {
  id: string;
  key: string;
  label: string;
  tokens: number;
  bonusPct: number;
  isFeatured: boolean;
  price: string;
  currencyCode: string;
}

export interface FreeQuota {
  quota: number;
  used: number;
  remaining: number;
}

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;

function currentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

@Injectable()
export class WalletService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly configService: ConfigService,
  ) {}

  async getBalance(userId: string): Promise<WalletBalance> {
    const [wallet] = await this.db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.userId, userId))
      .limit(1);

    if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
    return wallet;
  }

  async credit(
    userId: string,
    amount: number,
    reason: CreditReason,
    options?: {
      referenceId?: string;
      referenceType?: string;
      expiresAt?: Date;
    },
  ): Promise<CreditTxResult> {
    if (amount <= 0)
      throw new BadRequestException('Credit amount must be positive');

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.wallets)
        .set({
          balance: sql`${schema.wallets.balance} + ${amount}`,
          lifetimeEarned: sql`${schema.wallets.lifetimeEarned} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.wallets.userId, userId))
        .returning({ balance: schema.wallets.balance });

      if (!updated) throw new NotFoundException('WALLET_NOT_FOUND');

      const [txn] = await tx
        .insert(schema.creditTransactions)
        .values({
          userId,
          amount,
          balanceAfter: updated.balance,
          reason,
          referenceId: options?.referenceId,
          referenceType: options?.referenceType,
          expiresAt: options?.expiresAt,
        })
        .returning();

      return txn as CreditTxResult;
    });
  }

  async debit(
    userId: string,
    amount: number,
    reason: CreditReason,
    options?: { referenceId?: string; referenceType?: string },
  ): Promise<CreditTxResult> {
    if (amount <= 0)
      throw new BadRequestException('Debit amount must be positive');

    return this.db.transaction(async (tx) => {
      const [wallet] = await tx
        .select({ balance: schema.wallets.balance })
        .from(schema.wallets)
        .where(eq(schema.wallets.userId, userId))
        .for('update')
        .limit(1);

      if (!wallet) throw new NotFoundException('WALLET_NOT_FOUND');
      if (wallet.balance < amount)
        throw new HttpException(
          'INSUFFICIENT_BALANCE',
          HttpStatus.PAYMENT_REQUIRED,
        );

      const [updated] = await tx
        .update(schema.wallets)
        .set({
          balance: sql`${schema.wallets.balance} - ${amount}`,
          lifetimeSpent: sql`${schema.wallets.lifetimeSpent} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.wallets.userId, userId))
        .returning({ balance: schema.wallets.balance });

      const [txn] = await tx
        .insert(schema.creditTransactions)
        .values({
          userId,
          amount: -amount,
          balanceAfter: updated.balance,
          reason,
          referenceId: options?.referenceId,
          referenceType: options?.referenceType,
        })
        .returning();

      return txn as CreditTxResult;
    });
  }

  async getTransactionHistory(
    userId: string,
    cursor?: string,
    limit = DEFAULT_PAGE_LIMIT,
  ): Promise<PaginatedTransactions> {
    const pageSize = Math.min(limit, MAX_PAGE_LIMIT);
    const fetchCount = pageSize + 1;

    const conditions = [eq(schema.creditTransactions.userId, userId)];

    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      conditions.push(
        or(
          lt(schema.creditTransactions.createdAt, createdAt),
          and(
            eq(schema.creditTransactions.createdAt, createdAt),
            lt(schema.creditTransactions.id, id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.creditTransactions)
      .where(and(...conditions))
      .orderBy(
        desc(schema.creditTransactions.createdAt),
        desc(schema.creditTransactions.id),
      )
      .limit(fetchCount);

    const hasMore = rows.length > pageSize;
    const data = hasMore ? rows.slice(0, pageSize) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    return { data: data as CreditTxResult[], nextCursor, hasMore };
  }

  async getTokenPacks(countryCode = 'AR'): Promise<TokenPackWithPrice[]> {
    return this.db
      .select({
        id: schema.tokenPackDefinitions.id,
        key: schema.tokenPackDefinitions.key,
        label: schema.tokenPackDefinitions.label,
        tokens: schema.tokenPackDefinitions.tokens,
        bonusPct: schema.tokenPackDefinitions.bonusPct,
        isFeatured: schema.tokenPackDefinitions.isFeatured,
        price: schema.tokenPackPrices.price,
        currencyCode: schema.tokenPackPrices.currencyCode,
      })
      .from(schema.tokenPackDefinitions)
      .innerJoin(
        schema.tokenPackPrices,
        and(
          eq(schema.tokenPackPrices.packId, schema.tokenPackDefinitions.id),
          eq(schema.tokenPackPrices.countryCode, countryCode),
          eq(schema.tokenPackPrices.isActive, true),
        ),
      )
      .where(eq(schema.tokenPackDefinitions.isActive, true))
      .orderBy(asc(schema.tokenPackDefinitions.sortOrder));
  }

  async getFreeQuota(userId: string): Promise<FreeQuota> {
    const yearMonth = currentYearMonth();

    const [record] = await this.db
      .select()
      .from(schema.freeListingQuotas)
      .where(
        and(
          eq(schema.freeListingQuotas.userId, userId),
          eq(schema.freeListingQuotas.yearMonth, yearMonth),
        ),
      )
      .limit(1);

    if (record) {
      return {
        quota: record.quota,
        used: record.used,
        remaining: record.quota - record.used,
      };
    }

    const monthlyQuota = await this.configService.getNumber(
      'tokens.quota.monthly',
      5,
    );

    await this.db
      .insert(schema.freeListingQuotas)
      .values({ userId, yearMonth, quota: monthlyQuota, used: 0 })
      .onConflictDoNothing();

    return { quota: monthlyQuota, used: 0, remaining: monthlyQuota };
  }

  async consumeFreeQuota(userId: string): Promise<void> {
    const yearMonth = currentYearMonth();

    const result = await this.db
      .update(schema.freeListingQuotas)
      .set({ used: sql`${schema.freeListingQuotas.used} + 1` })
      .where(
        and(
          eq(schema.freeListingQuotas.userId, userId),
          eq(schema.freeListingQuotas.yearMonth, yearMonth),
          sql`${schema.freeListingQuotas.used} < ${schema.freeListingQuotas.quota}`,
        ),
      )
      .returning({ used: schema.freeListingQuotas.used });

    if (result.length === 0)
      throw new UnprocessableEntityException('FREE_QUOTA_EXHAUSTED');
  }
}
