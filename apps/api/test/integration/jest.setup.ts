import { execSync } from 'child_process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as schema from '../../src/database/schema';
import { CONFIG_SEED } from '../../src/database/seeds/config.seed';

const TEST_DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://tradealo:password@localhost:5433/tradealo_test';

let pool: Pool;

beforeAll(async () => {
  if (!process.env.CI) {
    execSync('docker compose -f docker-compose.test.yml up -d --wait', {
      stdio: 'inherit',
    });
    execSync('pnpm db:migrate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    });
  }

  pool = new Pool({ connectionString: TEST_DB_URL });
  const db = drizzle(pool, { schema });

  await seedTestConfig(db);
  await seedTestUsers(db);
}, 120_000);

afterAll(async () => {
  await pool?.end();
  if (!process.env.CI) {
    execSync('docker compose -f docker-compose.test.yml down -v', {
      stdio: 'inherit',
    });
  }
});

async function seedTestConfig(
  db: ReturnType<typeof drizzle<typeof schema>>,
): Promise<void> {
  for (const entry of CONFIG_SEED) {
    await db
      .insert(schema.systemConfigs)
      .values({
        key: entry.key,
        category: entry.category,
        label: entry.label,
        dataType: entry.dataType as typeof schema.systemConfigs.$inferInsert['dataType'],
        value: entry.value as unknown as Record<string, unknown>,
        defaultValue: entry.defaultValue as unknown as Record<string, unknown>,
        unit: entry.unit ?? null,
        isPublic: entry.isPublic,
        validation: (entry.validation ?? null) as Record<string, unknown> | null,
      })
      .onConflictDoNothing();
  }
}

async function seedTestUsers(
  db: ReturnType<typeof drizzle<typeof schema>>,
): Promise<void> {
  const hash = await bcrypt.hash('TestPass123!', 10);

  const users = [
    { email: FIXTURES.userNoKyc.email,      kycLevel: 0, role: 'user'          as const },
    { email: FIXTURES.userKyc1.email,        kycLevel: 1, role: 'user'          as const },
    { email: FIXTURES.userKyc2Seller.email,  kycLevel: 2, role: 'verified_user' as const },
    { email: FIXTURES.adminUser.email,       kycLevel: 2, role: 'super_admin'   as const },
  ];

  for (const u of users) {
    await db
      .insert(schema.users)
      .values({
        email: u.email,
        passwordHash: hash,
        kycLevel: u.kycLevel,
        role: u.role,
        emailVerified: true,
        referralCode: u.email.split('@')[0],
      })
      .onConflictDoNothing();
  }
}

export const FIXTURES = {
  userNoKyc:      { email: 'nokyc@test.com',       kycLevel: 0, password: 'TestPass123!' },
  userKyc1:       { email: 'kyc1@test.com',         kycLevel: 1, password: 'TestPass123!' },
  userKyc2Seller: { email: 'seller@test.com',       kycLevel: 2, password: 'TestPass123!' },
  adminUser:      { email: 'admin@tradealo.com.ar', role: 'super_admin' as const, password: 'TestPass123!' },
} as const;
