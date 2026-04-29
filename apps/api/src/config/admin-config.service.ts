import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq, asc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { DRIZZLE_TOKEN } from '../database/database.module'
import * as schema from '../database/schema'
import { ConfigService } from './config.service'

type DB = NodePgDatabase<typeof schema>
type SystemConfig = typeof schema.systemConfigs.$inferSelect

@Injectable()
export class AdminConfigService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly configService: ConfigService,
  ) {}

  async getAll(): Promise<SystemConfig[]> {
    return this.db
      .select()
      .from(schema.systemConfigs)
      .orderBy(asc(schema.systemConfigs.category), asc(schema.systemConfigs.key))
  }

  async update(
    key: string,
    newValue: unknown,
    adminId: string,
    reason: string,
  ): Promise<SystemConfig> {
    const [current] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key))
      .limit(1)

    if (!current) throw new NotFoundException(`Config key not found: ${key}`)

    this.validateValue(newValue, current)

    const [updated] = await this.db.transaction(async (tx) => {
      const result = await tx
        .update(schema.systemConfigs)
        .set({
          value: newValue as Record<string, unknown>,
          updatedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(schema.systemConfigs.key, key))
        .returning()

      await tx.insert(schema.systemConfigHistory).values({
        configKey: key,
        oldValue: current.value as Record<string, unknown>,
        newValue: newValue as Record<string, unknown>,
        changedBy: adminId,
        changeReason: reason,
      })

      return result
    })

    await this.configService.invalidateCache(key)
    return updated
  }

  async reset(key: string, adminId: string): Promise<SystemConfig> {
    const [current] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key))
      .limit(1)

    if (!current) throw new NotFoundException(`Config key not found: ${key}`)

    return this.update(key, current.defaultValue, adminId, 'Reset to default value')
  }

  private validateValue(value: unknown, config: SystemConfig): void {
    const { dataType } = config
    const validation = config.validation as Record<string, unknown> | null

    // Type-level checks run regardless of validation rules
    if (dataType === 'boolean' && typeof value !== 'boolean') {
      throw new BadRequestException(`Value must be a boolean for config key: ${config.key}`)
    }

    if (
      (dataType === 'integer' || dataType === 'decimal') &&
      (typeof value !== 'number' || isNaN(value as number))
    ) {
      throw new BadRequestException(`Value must be a number for config key: ${config.key}`)
    }

    if (dataType === 'integer' && !Number.isInteger(value)) {
      throw new BadRequestException(`Value must be an integer for config key: ${config.key}`)
    }

    if (!validation) return

    if (dataType === 'integer' || dataType === 'decimal') {
      const num = value as number
      if (validation.min !== undefined && num < (validation.min as number))
        throw new BadRequestException(
          `Value ${num} is below minimum ${validation.min} for config key: ${config.key}`,
        )
      if (validation.max !== undefined && num > (validation.max as number))
        throw new BadRequestException(
          `Value ${num} exceeds maximum ${validation.max} for config key: ${config.key}`,
        )
    }

    if (dataType === 'select') {
      const options = (validation.options as string[]) ?? []
      if (!options.includes(value as string))
        throw new BadRequestException(
          `Invalid value for config key: ${config.key}. Valid options: ${options.join(', ')}`,
        )
    }
  }
}
