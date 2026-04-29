import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type Redis from 'ioredis'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { REDIS_TOKEN } from '../redis/redis.module'
import * as schema from '../database/schema'

type DB = NodePgDatabase<typeof schema>

const CACHE_TTL = 300 // 5 minutes
const CACHE_PREFIX = 'config:'
const PUBLIC_CACHE_KEY = 'config:public'

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name)

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.warmCache()
    } catch (err) {
      this.logger.warn('Config cache warm-up failed — will lazy-load from DB', err)
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const cacheKey = `${CACHE_PREFIX}${key}`
    const cached = await this.redis.get(cacheKey)
    if (cached !== null) return JSON.parse(cached) as T

    const [row] = await this.db
      .select({ value: schema.systemConfigs.value })
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key))
      .limit(1)

    if (!row) return null

    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(row.value))
    return row.value as T
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const val = await this.get<number>(key)
    return typeof val === 'number' ? val : fallback
  }

  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const val = await this.get<boolean>(key)
    return typeof val === 'boolean' ? val : fallback
  }

  async getPublicConfigs(): Promise<Record<string, unknown>> {
    const cached = await this.redis.get(PUBLIC_CACHE_KEY)
    if (cached !== null) return JSON.parse(cached) as Record<string, unknown>

    const rows = await this.db
      .select({ key: schema.systemConfigs.key, value: schema.systemConfigs.value })
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.isPublic, true))

    const result: Record<string, unknown> = {}
    for (const row of rows) result[row.key] = row.value

    await this.redis.setex(PUBLIC_CACHE_KEY, CACHE_TTL, JSON.stringify(result))
    return result
  }

  async invalidateCache(key?: string): Promise<void> {
    if (key) {
      await this.redis.del(`${CACHE_PREFIX}${key}`)
      await this.redis.del(PUBLIC_CACHE_KEY)
    } else {
      const keys = await this.redis.keys(`${CACHE_PREFIX}*`)
      if (keys.length > 0) await this.redis.del(...keys)
    }
  }

  private async warmCache(): Promise<void> {
    const rows = await this.db
      .select({ key: schema.systemConfigs.key, value: schema.systemConfigs.value })
      .from(schema.systemConfigs)

    if (rows.length === 0) return

    const pipeline = this.redis.pipeline()
    for (const row of rows) {
      pipeline.setex(`${CACHE_PREFIX}${row.key}`, CACHE_TTL, JSON.stringify(row.value))
    }
    await pipeline.exec()
    this.logger.log(`Config cache warmed: ${rows.length} keys`)
  }
}
