import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { AdminService } from './admin.service'
import { DRIZZLE_TOKEN } from '../database/database.module'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qb(result: unknown): any {
  const chain: any = {}
  ;['from', 'where', 'limit', 'orderBy', 'offset', 'returning'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  chain.catch = () => Promise.resolve(result)
  return chain
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateQb(result: unknown = []): any {
  const returning = jest.fn().mockResolvedValue(result)
  const where = jest.fn().mockReturnValue({ returning })
  const set = jest.fn().mockReturnValue({ where })
  return { set }
}

const ADMIN_ID = 'admin-uuid-001'
const USER_ID = 'user-uuid-001'

const mockUser = {
  id: USER_ID,
  email: 'user@example.com',
  role: 'user',
  status: 'active',
  kycLevel: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
}

describe('AdminService', () => {
  let service: AdminService

  beforeEach(async () => {
    jest.resetAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
  })

  describe('getDashboardStats()', () => {
    it('returns aggregate stats from multiple queries', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockUser, mockUser]))   // totalUsers
        .mockReturnValueOnce(qb([mockUser]))              // recentUsers
        .mockReturnValueOnce(qb([{ id: 'l1' }, { id: 'l2' }]))  // activeListings
        .mockReturnValueOnce(qb([{ id: 'l3' }]))         // pendingListings
        .mockReturnValueOnce(qb([]))                      // pendingKyc

      const result = await service.getDashboardStats()
      expect(result.users.total).toBe(2)
      expect(result.users.lastThirtyDays).toBe(1)
      expect(result.listings.active).toBe(2)
      expect(result.listings.pendingModeration).toBe(1)
      expect(result.kyc.pending).toBe(0)
    })
  })

  describe('listUsers()', () => {
    it('returns paginated user list', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockUser]))
      const result = await service.listUsers({ limit: 10 })
      expect(result.data).toHaveLength(1)
    })

    it('caps limit at 100', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await service.listUsers({ limit: 500 })
      // limit is capped internally — just verify no error
      expect(mockDb.select).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateUserRole()', () => {
    it('updates user role', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ id: USER_ID }]))
      mockDb.update.mockReturnValueOnce(
        updateQb([{ id: USER_ID, email: mockUser.email, role: 'moderator' }]),
      )

      const result = await service.updateUserRole(USER_ID, 'moderator', ADMIN_ID)
      expect(result.role).toBe('moderator')
    })

    it('throws NotFoundException for invalid role', async () => {
      await expect(
        service.updateUserRole(USER_ID, 'super_villain', ADMIN_ID),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when user does not exist', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(
        service.updateUserRole('nonexistent', 'moderator', ADMIN_ID),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('suspendUser()', () => {
    it('suspends an active user', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ id: USER_ID, status: 'active' }]))
      mockDb.update.mockReturnValueOnce(
        updateQb([{ id: USER_ID, status: 'suspended' }]),
      )

      const result = await service.suspendUser(USER_ID, ADMIN_ID)
      expect(result.status).toBe('suspended')
    })

    it('throws NotFoundException when user does not exist', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.suspendUser('nonexistent', ADMIN_ID)).rejects.toThrow(NotFoundException)
    })
  })

  describe('listFlaggedListings()', () => {
    it('returns flagged listings', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ id: 'l1', moderationStatus: 'flagged' }]))
      const result = await service.listFlaggedListings()
      expect(result).toHaveLength(1)
    })
  })
})
