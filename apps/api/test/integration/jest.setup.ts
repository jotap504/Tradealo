import { execSync } from 'child_process'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as bcrypt from 'bcrypt'
import * as schema from '../../src/database/schema'

const TEST_DB_URL = process.env.DATABASE_URL ?? 'postgresql://tradealo:password@localhost:5433/tradealo_test'

let pool: Pool

beforeAll(async () => {
  execSync('docker compose -f docker-compose.test.yml up -d --wait', { stdio: 'inherit' })
  execSync('pnpm db:migrate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  })

  pool = new Pool({ connectionString: TEST_DB_URL })
  const db = drizzle(pool, { schema })

  await seedTestConfig(db)
  await seedTestUsers(db)
}, 120_000)

afterAll(async () => {
  await pool?.end()
  execSync('docker compose -f docker-compose.test.yml down -v', { stdio: 'inherit' })
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedTestConfig(db: ReturnType<typeof drizzle<any>>): Promise<void> {
  const typedDb = db as ReturnType<typeof drizzle<typeof schema>>
  const configs = [
    { key: 'listing.base_cost',              value: '2',    type: 'number'  as const, description: 'Token cost per listing' },
    { key: 'listing.duration.multiplier_60', value: '1.5',  type: 'number'  as const, description: '60-day multiplier' },
    { key: 'listing.duration.multiplier_90', value: '2',    type: 'number'  as const, description: '90-day multiplier' },
    { key: 'listing.free_monthly_quota',     value: '1',    type: 'number'  as const, description: 'Free listings per month' },
    { key: 'wallet.welcome_tokens',          value: '5',    type: 'number'  as const, description: 'Tokens on registration' },
    { key: 'ai.text.enabled',               value: 'true', type: 'boolean' as const, description: 'AI text generation' },
    { key: 'ai.daily_limit',                value: '3',    type: 'number'  as const, description: 'AI requests per day' },
  ]

  for (const cfg of configs) {
    await typedDb
      .insert(schema.systemConfig)
      .values({ key: cfg.key, value: cfg.value, type: cfg.type, description: cfg.description })
      .onConflictDoUpdate({ target: schema.systemConfig.key, set: { value: cfg.value } })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedTestUsers(db: ReturnType<typeof drizzle<any>>): Promise<void> {
  const hash = await bcrypt.hash('TestPass123!', 10)
  const typedDb = db as ReturnType<typeof drizzle<typeof schema>>

  const users = [
    { email: FIXTURES.userNoKyc.email,      kycLevel: 0, role: 'user'        as const },
    { email: FIXTURES.userKyc1.email,        kycLevel: 1, role: 'user'        as const },
    { email: FIXTURES.userKyc2Seller.email,  kycLevel: 2, role: 'verified_user' as const },
    { email: FIXTURES.adminUser.email,       kycLevel: 2, role: 'super_admin' as const },
  ]

  for (const u of users) {
    await typedDb
      .insert(schema.users)
      .values({
        email: u.email,
        passwordHash: hash,
        kycLevel: u.kycLevel,
        role: u.role,
        emailVerified: true,
        referralCode: u.email.split('@')[0],
      })
      .onConflictDoNothing()
  }
}

export const FIXTURES = {
  userNoKyc:      { email: 'nokyc@test.com',       kycLevel: 0, password: 'TestPass123!' },
  userKyc1:       { email: 'kyc1@test.com',         kycLevel: 1, password: 'TestPass123!' },
  userKyc2Seller: { email: 'seller@test.com',       kycLevel: 2, password: 'TestPass123!' },
  adminUser:      { email: 'admin@tradealo.com.ar', role: 'super_admin' as const, password: 'TestPass123!' },
} as const
