import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { ConfigService } from '../config/config.service'
import { encodeCursor } from '../common/utils/cursor.util'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qb(result: unknown): any {
  const chain: any = {}
  ;['from', 'where', 'limit', 'orderBy', 'innerJoin', 'onConflictDoNothing'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  chain.catch = () => Promise.resolve(result)
  return chain
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateQb(result: unknown): any {
  const returning = jest.fn().mockResolvedValue(result)
  const where = jest.fn().mockReturnValue({ returning })
  const set = jest.fn().mockReturnValue({ where })
  return { set }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertQb(result: unknown = undefined): any {
  const returning = jest.fn().mockResolvedValue(result)
  const onConflictDoNothing = jest.fn().mockResolvedValue(undefined)
  const values = jest.fn().mockReturnValue({ returning, onConflictDoNothing })
  return { values }
}

const USER_ID = 'user-uuid-001'

const mockWallet = {
  userId: USER_ID,
  balance: 10,
  lifetimeEarned: 15,
  lifetimeSpent: 5,
  updatedAt: new Date(),
}

const mockTxn = {
  id: 'txn-uuid-001',
  userId: USER_ID,
  amount: 5,
  balanceAfter: 15,
  reason: 'registration_bonus',
  referenceId: null,
  referenceType: null,
  expiresAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  transaction: jest.fn(),
}

const mockConfigService = {
  getNumber: jest.fn().mockResolvedValue(5),
}

describe('WalletService', () => {
  let service: WalletService

  beforeEach(async () => {
    jest.resetAllMocks()
    mockConfigService.getNumber.mockResolvedValue(5)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<WalletService>(WalletService)
  })

  describe('getBalance()', () => {
    it('returns wallet when found', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockWallet]))
      const result = await service.getBalance(USER_ID)
      expect(result.balance).toBe(10)
      expect(result.userId).toBe(USER_ID)
    })

    it('throws NotFoundException when wallet not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.getBalance(USER_ID)).rejects.toThrow(NotFoundException)
    })
  })

  describe('credit()', () => {
    it('increments balance and creates credit transaction', async () => {
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
          const tx = {
            update: jest.fn().mockReturnValue(updateQb([{ balance: 15 }])),
            insert: jest.fn().mockReturnValue(insertQb([mockTxn])),
          }
          return fn(tx as any)
        },
      )
      const result = await service.credit(USER_ID, 5, 'registration_bonus')
      expect(result.amount).toBe(5)
      expect(result.balanceAfter).toBe(15)
    })

    it('throws BadRequestException when amount is zero or negative', async () => {
      await expect(service.credit(USER_ID, 0, 'registration_bonus')).rejects.toThrow(BadRequestException)
      await expect(service.credit(USER_ID, -1, 'registration_bonus')).rejects.toThrow(BadRequestException)
    })

    it('throws NotFoundException when wallet update returns empty (user not found)', async () => {
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
          const tx = { update: jest.fn().mockReturnValue(updateQb([])) }
          return fn(tx as any)
        },
      )
      await expect(service.credit('nonexistent', 5, 'registration_bonus')).rejects.toThrow(NotFoundException)
    })
  })

  describe('debit()', () => {
    it('decrements balance and creates debit transaction', async () => {
      const debitTxn = { ...mockTxn, amount: -3, balanceAfter: 7 }
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
          const tx = {
            select: jest.fn().mockReturnValue(qb([{ balance: 10 }])),
            update: jest.fn().mockReturnValue(updateQb([{ balance: 7 }])),
            insert: jest.fn().mockReturnValue(insertQb([debitTxn])),
          }
          return fn(tx as any)
        },
      )
      const result = await service.debit(USER_ID, 3, 'listing_publish')
      expect(result.amount).toBe(-3)
      expect(result.balanceAfter).toBe(7)
    })

    it('throws UnprocessableEntityException when balance is insufficient', async () => {
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
          const tx = { select: jest.fn().mockReturnValue(qb([{ balance: 2 }])) }
          return fn(tx as any)
        },
      )
      await expect(service.debit(USER_ID, 10, 'listing_publish')).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws NotFoundException when wallet not found', async () => {
      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
          const tx = { select: jest.fn().mockReturnValue(qb([])) }
          return fn(tx as any)
        },
      )
      await expect(service.debit('nonexistent', 3, 'listing_publish')).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when amount is zero or negative', async () => {
      await expect(service.debit(USER_ID, 0, 'listing_publish')).rejects.toThrow(BadRequestException)
    })
  })

  describe('getTransactionHistory()', () => {
    it('returns first page without cursor', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockTxn]))
      const result = await service.getTransactionHistory(USER_ID)
      expect(result.data).toHaveLength(1)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('returns hasMore=true and nextCursor when more rows exist', async () => {
      const rows = Array.from({ length: 21 }, (_, i) => ({
        ...mockTxn,
        id: `txn-${i}`,
        createdAt: new Date(`2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
      }))
      mockDb.select.mockReturnValueOnce(qb(rows))
      const result = await service.getTransactionHistory(USER_ID, undefined, 20)
      expect(result.data).toHaveLength(20)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).not.toBeNull()
    })

    it('applies cursor filter when cursor is provided', async () => {
      const cursor = encodeCursor({ createdAt: new Date('2026-01-15T00:00:00Z'), id: 'txn-x' })
      mockDb.select.mockReturnValueOnce(qb([mockTxn]))
      const result = await service.getTransactionHistory(USER_ID, cursor, 20)
      expect(result.data).toHaveLength(1)
    })

    it('caps limit at MAX_PAGE_LIMIT (50)', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await service.getTransactionHistory(USER_ID, undefined, 200)
      // Just verify no error thrown and result is returned
    })
  })

  describe('getTokenPacks()', () => {
    const mockPack = {
      id: 'pack-1', key: 'starter', label: 'Starter', tokens: 10,
      bonusPct: 0, isFeatured: false, price: '500.00', currencyCode: 'ARS',
    }

    it('returns token packs with prices for given country', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockPack]))
      const result = await service.getTokenPacks('AR')
      expect(result).toEqual([mockPack])
    })

    it('defaults country to AR', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockPack]))
      await service.getTokenPacks()
    })
  })

  describe('getFreeQuota()', () => {
    it('returns existing quota record', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ quota: 5, used: 2, yearMonth: '2026-04', userId: USER_ID }]))
      const result = await service.getFreeQuota(USER_ID)
      expect(result).toEqual({ quota: 5, used: 2, remaining: 3 })
    })

    it('creates quota record from config when none exists', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      mockDb.insert.mockReturnValueOnce(insertQb())
      mockConfigService.getNumber.mockResolvedValueOnce(5)
      const result = await service.getFreeQuota(USER_ID)
      expect(result).toEqual({ quota: 5, used: 0, remaining: 5 })
    })
  })

  describe('consumeFreeQuota()', () => {
    it('increments used count when quota available', async () => {
      mockDb.update.mockReturnValueOnce(updateQb([{ used: 1 }]))
      await expect(service.consumeFreeQuota(USER_ID)).resolves.not.toThrow()
    })

    it('throws UnprocessableEntityException when quota exhausted', async () => {
      mockDb.update.mockReturnValueOnce(updateQb([]))
      await expect(service.consumeFreeQuota(USER_ID)).rejects.toThrow(UnprocessableEntityException)
    })
  })
})
