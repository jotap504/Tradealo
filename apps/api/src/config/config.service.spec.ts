import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from './config.service'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { REDIS_TOKEN } from '../redis/redis.module'

// Drizzle builders are thenables — qb() creates a chainable mock that resolves to `result`
function qb(result: unknown, rejectWith?: Error) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {}
  ;['from', 'where', 'limit', 'orderBy', 'select'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  if (rejectWith) {
    chain.then = (_resolve: unknown, reject?: (e: unknown) => unknown) =>
      Promise.reject(rejectWith).then(undefined, reject)
    chain.catch = (fn: (e: unknown) => unknown) => Promise.reject(rejectWith).catch(fn)
  } else {
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
    chain.catch = () => Promise.resolve(result)
  }
  return chain
}

const mockDb = { select: jest.fn() }

const mockPipeline = {
  setex: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
}

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  pipeline: jest.fn().mockReturnValue(mockPipeline),
}

describe('ConfigService', () => {
  let service: ConfigService

  beforeEach(async () => {
    jest.resetAllMocks()
    mockRedis.setex.mockResolvedValue('OK')
    mockRedis.del.mockResolvedValue(1)
    mockRedis.keys.mockResolvedValue([])
    mockRedis.pipeline.mockReturnValue(mockPipeline)
    mockPipeline.setex.mockReturnThis()
    mockPipeline.exec.mockResolvedValue([])

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: REDIS_TOKEN, useValue: mockRedis },
      ],
    }).compile()

    service = module.get<ConfigService>(ConfigService)
  })

  describe('onModuleInit()', () => {
    it('warms cache from DB on init', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([
          { key: 'tokens.reward.registration', value: 5 },
          { key: 'features.collectibles', value: true },
        ]),
      )
      await service.onModuleInit()
      expect(mockRedis.pipeline).toHaveBeenCalled()
      expect(mockPipeline.exec).toHaveBeenCalled()
    })

    it('does not throw when DB is unavailable on init', async () => {
      mockDb.select.mockReturnValueOnce(qb(null, new Error('DB down')))
      await expect(service.onModuleInit()).resolves.not.toThrow()
    })
  })

  describe('get()', () => {
    it('returns parsed value from Redis cache on hit', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(42))
      const result = await service.get<number>('tokens.reward.registration')
      expect(result).toBe(42)
      expect(mockDb.select).not.toHaveBeenCalled()
    })

    it('falls back to DB on cache miss and caches the result', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      mockDb.select.mockReturnValueOnce(qb([{ value: 5 }]))
      const result = await service.get<number>('tokens.reward.registration')
      expect(result).toBe(5)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'config:tokens.reward.registration',
        300,
        JSON.stringify(5),
      )
    })

    it('returns null when key not found in DB', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      mockDb.select.mockReturnValueOnce(qb([]))
      const result = await service.get('nonexistent.key')
      expect(result).toBeNull()
    })
  })

  describe('getNumber()', () => {
    it('returns number value when found', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(10))
      expect(await service.getNumber('some.key', 0)).toBe(10)
    })

    it('returns fallback when key not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      mockDb.select.mockReturnValueOnce(qb([]))
      expect(await service.getNumber('some.key', 99)).toBe(99)
    })
  })

  describe('getBoolean()', () => {
    it('returns boolean value when found', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(false))
      expect(await service.getBoolean('features.maintenance_mode', true)).toBe(false)
    })

    it('returns fallback when key not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      mockDb.select.mockReturnValueOnce(qb([]))
      expect(await service.getBoolean('missing.key', true)).toBe(true)
    })
  })

  describe('getPublicConfigs()', () => {
    it('returns parsed object from Redis when cached', async () => {
      const cached = { 'listing.cost.standard': 2, 'features.maintenance_mode': false }
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached))
      expect(await service.getPublicConfigs()).toEqual(cached)
    })

    it('queries DB and caches result on miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      mockDb.select.mockReturnValueOnce(
        qb([
          { key: 'listing.cost.standard', value: 2 },
          { key: 'features.maintenance_mode', value: false },
        ]),
      )
      const result = await service.getPublicConfigs()
      expect(result).toEqual({ 'listing.cost.standard': 2, 'features.maintenance_mode': false })
      expect(mockRedis.setex).toHaveBeenCalledWith('config:public', 300, expect.any(String))
    })
  })

  describe('invalidateCache()', () => {
    it('deletes specific key and public cache when key is provided', async () => {
      await service.invalidateCache('tokens.reward.registration')
      expect(mockRedis.del).toHaveBeenCalledWith('config:tokens.reward.registration')
      expect(mockRedis.del).toHaveBeenCalledWith('config:public')
    })

    it('deletes all config keys when no key provided', async () => {
      mockRedis.keys.mockResolvedValueOnce(['config:a', 'config:b'])
      await service.invalidateCache()
      expect(mockRedis.del).toHaveBeenCalledWith('config:a', 'config:b')
    })

    it('does nothing when cache is empty and no key provided', async () => {
      mockRedis.keys.mockResolvedValueOnce([])
      await service.invalidateCache()
      expect(mockRedis.del).not.toHaveBeenCalled()
    })
  })
})
