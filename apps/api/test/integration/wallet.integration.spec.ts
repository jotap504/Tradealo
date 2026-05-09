import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { WalletService } from '../../src/wallet/wallet.service';
import { ConfigService } from '../../src/config/config.service';
import { DRIZZLE_TOKEN } from '../../src/database/database.module';
import * as schema from '../../src/database/schema';

const TEST_DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://tradealo:password@localhost:5433/tradealo_test';

describe('WalletService (integration)', () => {
  let module: TestingModule;
  let walletService: WalletService;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let pool: Pool;
  let userId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB_URL });
    db = drizzle(pool, { schema });

    const [user] = await db
      .insert(schema.users)
      .values({
        email: `wallet-integ-${Date.now()}@test.com`,
        passwordHash: 'hashed_for_test',
        kycLevel: 0,
        emailVerified: true,
        referralCode: Math.random().toString(36).substring(2, 12),
      })
      .returning({ id: schema.users.id });
    userId = user.id;

    await db.insert(schema.wallets).values({ userId });

    module = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: DRIZZLE_TOKEN, useValue: db },
        {
          provide: ConfigService,
          useValue: { getNumber: jest.fn().mockResolvedValue(5) },
        },
      ],
    }).compile();

    walletService = module.get(WalletService);
  }, 30_000);

  afterAll(async () => {
    if (userId) {
      await db
        .delete(schema.creditTransactions)
        .where(eq(schema.creditTransactions.userId, userId));
      await db.delete(schema.wallets).where(eq(schema.wallets.userId, userId));
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    }
    await module?.close();
    await pool?.end();
  });

  beforeEach(async () => {
    await db
      .update(schema.wallets)
      .set({ balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 })
      .where(eq(schema.wallets.userId, userId));
    await db
      .delete(schema.creditTransactions)
      .where(eq(schema.creditTransactions.userId, userId));
  });

  // ─── credit() ────────────────────────────────────────────────────────────

  describe('credit()', () => {
    it('incrementa el balance correctamente', async () => {
      const txn = await walletService.credit(userId, 10, 'registration_bonus');
      expect(txn.amount).toBe(10);
      expect(txn.balanceAfter).toBe(10);

      const wallet = await walletService.getBalance(userId);
      expect(wallet.balance).toBe(10);
    });

    it('crea credit_transaction con amount positivo', async () => {
      const txn = await walletService.credit(userId, 5, 'registration_bonus');
      expect(txn.userId).toBe(userId);
      expect(txn.amount).toBeGreaterThan(0);
    });

    it('tokens con expiresAt se registran correctamente', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const txn = await walletService.credit(userId, 8, 'token_purchase', {
        expiresAt,
      });
      expect(txn.expiresAt).not.toBeNull();
    });

    it('tokens de recompensa tienen expiresAt null', async () => {
      const txn = await walletService.credit(userId, 5, 'registration_bonus');
      expect(txn.expiresAt).toBeNull();
    });
  });

  // ─── debit() ─────────────────────────────────────────────────────────────

  describe('debit()', () => {
    beforeEach(async () => {
      await walletService.credit(userId, 10, 'registration_bonus');
    });

    it('reduce el balance correctamente', async () => {
      const txn = await walletService.debit(userId, 3, 'listing_publish');
      expect(txn.amount).toBe(-3);
      expect(txn.balanceAfter).toBe(7);

      const wallet = await walletService.getBalance(userId);
      expect(wallet.balance).toBe(7);
    });

    it('crea credit_transaction con amount negativo', async () => {
      const txn = await walletService.debit(userId, 5, 'listing_publish');
      expect(txn.amount).toBe(-5);
    });

    it('balanceAfter en la transacción refleja el balance real', async () => {
      const txn = await walletService.debit(userId, 4, 'listing_publish');
      const wallet = await walletService.getBalance(userId);
      expect(txn.balanceAfter).toBe(wallet.balance);
    });

    it('lanza INSUFFICIENT_BALANCE si balance < amount', async () => {
      await expect(
        walletService.debit(userId, 20, 'listing_publish'),
      ).rejects.toThrow();
    });

    it('lanza INSUFFICIENT_BALANCE si balance = 0', async () => {
      await walletService.debit(userId, 10, 'listing_publish');
      await expect(
        walletService.debit(userId, 1, 'listing_publish'),
      ).rejects.toThrow();
    });
  });

  // ─── race condition (WALLET-008) ─────────────────────────────────────────

  describe('race condition — SELECT FOR UPDATE (WALLET-008)', () => {
    it('2 debits simultáneos de 5 tokens con balance 8 → exactamente uno falla', async () => {
      await walletService.credit(userId, 8, 'registration_bonus');

      const results = await Promise.allSettled([
        walletService.debit(userId, 5, 'listing_publish'),
        walletService.debit(userId, 5, 'listing_publish'),
      ]);

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      expect(succeeded).toBe(1);
      expect(failed).toBe(1);

      const wallet = await walletService.getBalance(userId);
      expect(wallet.balance).toBe(3); // 8 - 5 = 3, el segundo falla
    });
  });

  // ─── invariante de integridad (WALLET-007) ───────────────────────────────

  describe('invariante de integridad (WALLET-007)', () => {
    it('SUM(credit_transactions.amount) == wallets.balance', async () => {
      await walletService.credit(userId, 10, 'registration_bonus');
      await walletService.credit(userId, 5, 'token_purchase');
      await walletService.debit(userId, 3, 'listing_publish');
      await walletService.debit(userId, 2, 'listing_publish');

      const [{ total }] = await db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)::int` })
        .from(schema.creditTransactions)
        .where(eq(schema.creditTransactions.userId, userId));

      const wallet = await walletService.getBalance(userId);
      expect(Number(total)).toBe(wallet.balance); // 10 + 5 - 3 - 2 = 10
    });
  });
});
