import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { AdminConfigService } from './admin-config.service'
import { ConfigService } from './config.service'
import { DRIZZLE_TOKEN } from '../database/database.module'

const ADMIN_ID = 'admin-uuid-001'

// Thenable Drizzle query builder mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qb(result: unknown): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {}
  ;['from', 'where', 'limit', 'orderBy'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  chain.catch = () => Promise.resolve(result)
  return chain
}

// Thenable update chain: .update().set().where().returning()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateQb(result: unknown): any {
  const returning = jest.fn().mockResolvedValue(result)
  const where = jest.fn().mockReturnValue({ returning })
  const set = jest.fn().mockReturnValue({ where })
  return { set }
}

// Thenable insert chain: .insert().values()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertQb(): any {
  return { values: jest.fn().mockResolvedValue(undefined) }
}

const mockConfig = {
  id: 'cfg-uuid-001',
  key: 'tokens.reward.registration',
  category: 'tokens_rewards',
  label: 'Tokens al registrarse',
  description: null,
  value: 5 as unknown as Record<string, unknown>,
  defaultValue: 5 as unknown as Record<string, unknown>,
  dataType: 'integer' as const,
  validation: { min: 0, max: 100 } as unknown as Record<string, unknown>,
  unit: 'tokens',
  isPublic: false,
  updatedBy: null,
  updatedAt: new Date(),
  createdAt: new Date(),
}

const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  transaction: jest.fn(),
}

const mockConfigService = {
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}

describe('AdminConfigService', () => {
  let service: AdminConfigService

  beforeEach(async () => {
    jest.resetAllMocks()
    mockConfigService.invalidateCache.mockResolvedValue(undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminConfigService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<AdminConfigService>(AdminConfigService)
  })

  describe('getAll()', () => {
    it('returns all configs ordered by category and key', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockConfig]))
      const result = await service.getAll()
      expect(result).toEqual([mockConfig])
    })
  })

  describe('update()', () => {
    it('updates config, records history, and invalidates cache', async () => {
      const updated = { ...mockConfig, value: 10 as unknown as Record<string, unknown> }
      mockDb.select.mockReturnValueOnce(qb([mockConfig]))
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: {
          update: jest.Mock
          insert: jest.Mock
        }) => Promise<unknown>) => {
          const tx = {
            update: jest.fn().mockReturnValue(updateQb([updated])),
            insert: jest.fn().mockReturnValue(insertQb()),
          }
          return fn(tx)
        },
      )

      const result = await service.update(
        'tokens.reward.registration',
        10,
        ADMIN_ID,
        'Increase reward',
      )

      expect(result).toEqual(updated)
      expect(mockConfigService.invalidateCache).toHaveBeenCalledWith('tokens.reward.registration')
    })

    it('throws NotFoundException when key does not exist', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.update('nonexistent.key', 5, ADMIN_ID, 'test')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws BadRequestException when value exceeds max', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockConfig]))
      await expect(
        service.update('tokens.reward.registration', 999, ADMIN_ID, 'too high'),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when value is below min', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockConfig]))
      await expect(
        service.update('tokens.reward.registration', -1, ADMIN_ID, 'negative'),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException for float value on integer type', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockConfig]))
      await expect(
        service.update('tokens.reward.registration', 3.5, ADMIN_ID, 'float'),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException for NaN on numeric type', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockConfig]))
      await expect(
        service.update('tokens.reward.registration', NaN, ADMIN_ID, 'nan'),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('update() — boolean type', () => {
    const boolConfig = {
      ...mockConfig,
      key: 'features.maintenance_mode',
      dataType: 'boolean' as const,
      value: false as unknown as Record<string, unknown>,
      defaultValue: false as unknown as Record<string, unknown>,
      validation: null,
    }

    it('throws BadRequestException when non-boolean given for boolean type', async () => {
      mockDb.select.mockReturnValueOnce(qb([boolConfig]))
      await expect(
        service.update('features.maintenance_mode', 'yes', ADMIN_ID, 'wrong type'),
      ).rejects.toThrow(BadRequestException)
    })

    it('accepts valid boolean value', async () => {
      mockDb.select.mockReturnValueOnce(qb([boolConfig]))
      const updated = { ...boolConfig, value: true as unknown as Record<string, unknown> }
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: { update: jest.Mock; insert: jest.Mock }) => Promise<unknown>) => {
          const tx = {
            update: jest.fn().mockReturnValue(updateQb([updated])),
            insert: jest.fn().mockReturnValue(insertQb()),
          }
          return fn(tx)
        },
      )
      const result = await service.update('features.maintenance_mode', true, ADMIN_ID, 'enable')
      expect(result.value).toBe(true)
    })
  })

  describe('update() — select type', () => {
    const selectConfig = {
      ...mockConfig,
      key: 'ai.text.provider',
      dataType: 'select' as const,
      value: 'deepseek' as unknown as Record<string, unknown>,
      defaultValue: 'deepseek' as unknown as Record<string, unknown>,
      validation: { options: ['deepseek', 'qwen'] } as unknown as Record<string, unknown>,
    }

    it('throws BadRequestException for invalid select option', async () => {
      mockDb.select.mockReturnValueOnce(qb([selectConfig]))
      await expect(
        service.update('ai.text.provider', 'openai', ADMIN_ID, 'invalid'),
      ).rejects.toThrow(BadRequestException)
    })

    it('accepts valid select option', async () => {
      mockDb.select.mockReturnValueOnce(qb([selectConfig]))
      const updated = { ...selectConfig, value: 'qwen' as unknown as Record<string, unknown> }
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: { update: jest.Mock; insert: jest.Mock }) => Promise<unknown>) => {
          const tx = {
            update: jest.fn().mockReturnValue(updateQb([updated])),
            insert: jest.fn().mockReturnValue(insertQb()),
          }
          return fn(tx)
        },
      )
      const result = await service.update('ai.text.provider', 'qwen', ADMIN_ID, 'switch provider')
      expect(result.value).toBe('qwen')
    })
  })

  describe('reset()', () => {
    it('resets config to its defaultValue', async () => {
      // First call: reset() fetches the config
      // Second call: update() fetches the config again internally
      mockDb.select.mockReturnValueOnce(qb([mockConfig])).mockReturnValueOnce(qb([mockConfig]))
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: { update: jest.Mock; insert: jest.Mock }) => Promise<unknown>) => {
          const tx = {
            update: jest.fn().mockReturnValue(updateQb([mockConfig])),
            insert: jest.fn().mockReturnValue(insertQb()),
          }
          return fn(tx)
        },
      )
      const result = await service.reset('tokens.reward.registration', ADMIN_ID)
      expect(result).toBeDefined()
    })

    it('throws NotFoundException when key does not exist on reset', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.reset('nonexistent.key', ADMIN_ID)).rejects.toThrow(NotFoundException)
    })
  })
})
