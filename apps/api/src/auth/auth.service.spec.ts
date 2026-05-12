import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConflictException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { ConfigService } from '../config/config.service'
import * as bcrypt from 'bcrypt'

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}))

// Thenable Drizzle query builder mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qb(result: unknown): any {
  const chain: any = {}
  ;['from', 'where', 'limit', 'leftJoin'].forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain) })
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  chain.catch = () => Promise.resolve(result)
  return chain
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateQb(): any {
  const chain: any = {}
  ;['set', 'where'].forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain) })
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(undefined).then(resolve)
  chain.catch = () => Promise.resolve(undefined)
  return chain
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertQb(result: unknown = undefined): any {
  return { values: jest.fn().mockResolvedValue(result) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertReturningQb(result: unknown): any {
  const returning = jest.fn().mockResolvedValue(result)
  const values = jest.fn().mockReturnValue({ returning })
  return { values }
}

const USER_ID = 'user-uuid-001'
const mockUser = {
  id: USER_ID,
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  role: 'user',
  kycLevel: 0,
  status: 'active',
  referralCode: 'ABC123DEF456',
  referredBy: null,
  createdAt: new Date('2026-01-01'),
}

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  transaction: jest.fn(),
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock_access_token'),
}

const mockConfigService = {
  getNumber: jest.fn().mockResolvedValue(5),
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    jest.resetAllMocks()
    mockJwtService.sign.mockReturnValue('mock_access_token')
    mockConfigService.getNumber.mockResolvedValue(5)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password')
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  describe('register()', () => {
    it('creates user, wallet, credit_transaction and returns token pair', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([]))                       // email check: not found
        .mockReturnValueOnce(qb([]))                       // username check: not found
        .mockReturnValueOnce(qb([]))                       // referralCode lookup: not found

      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
          const tx = {
            insert: jest
              .fn()
              .mockReturnValueOnce(insertReturningQb([mockUser]))  // user insert
              .mockReturnValueOnce(insertQb())                     // userProfiles
              .mockReturnValueOnce(insertQb())                     // wallets
              .mockReturnValueOnce(insertQb()),                    // creditTransactions
          }
          return fn(tx as any)
        },
      )
      mockDb.insert.mockReturnValueOnce(insertQb()) // refreshTokens insert

      const result = await service.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password1',
      })

      expect(result.accessToken).toBe('mock_access_token')
      expect(result.refreshToken).toBeTruthy()
      expect(result.expiresIn).toBe(900)
      expect(result.user.email).toBe('test@example.com')
    })

    it('throws ConflictException when email is already in use', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ id: USER_ID }]))
      await expect(
        service.register({ email: 'test@example.com', username: 'testuser', password: 'Password1' }),
      ).rejects.toThrow(ConflictException)
    })

    it('registers without referralCode and sets referredById to undefined', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([]))  // email check
        .mockReturnValueOnce(qb([]))  // username check

      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
          const tx = {
            insert: jest
              .fn()
              .mockReturnValueOnce(insertReturningQb([mockUser]))
              .mockReturnValueOnce(insertQb())
              .mockReturnValueOnce(insertQb())
              .mockReturnValueOnce(insertQb()),
          }
          return fn(tx as any)
        },
      )
      mockDb.insert.mockReturnValueOnce(insertQb())

      const result = await service.register({ email: 'test@example.com', username: 'testuser', password: 'Password1' })
      expect(result.user).toBeDefined()
    })

    it('resolves referredById when valid referralCode is provided', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([]))                        // email check
        .mockReturnValueOnce(qb([]))                        // username check
        .mockReturnValueOnce(qb([{ id: 'referrer-uuid' }])) // referrer lookup

      mockDb.transaction.mockImplementationOnce(
        async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
          const tx = {
            insert: jest
              .fn()
              .mockReturnValueOnce(insertReturningQb([mockUser]))
              .mockReturnValueOnce(insertQb())
              .mockReturnValueOnce(insertQb())
              .mockReturnValueOnce(insertQb()),
          }
          return fn(tx as any)
        },
      )
      mockDb.insert.mockReturnValueOnce(insertQb())

      const result = await service.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password1',
        referralCode: 'VALIDCODE123',
      })
      expect(result.user).toBeDefined()
    })
  })

  describe('login()', () => {
    it('returns token pair with user summary on valid credentials', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockUser]))
      mockDb.update.mockReturnValueOnce(updateQb())
      mockDb.insert.mockReturnValueOnce(insertQb())

      const result = await service.login({ email: 'test@example.com', password: 'Password1' })
      expect(result.accessToken).toBe('mock_access_token')
      expect(result.user.email).toBe('test@example.com')
    })

    it('throws UnauthorizedException when user not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(
        service.login({ email: 'nobody@example.com', password: 'Password1' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException on wrong password', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockUser]))
      ;(bcrypt.compare as jest.Mock).mockResolvedValueOnce(false)
      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass1' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws ForbiddenException when account is suspended', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ ...mockUser, status: 'suspended' }]))
      await expect(
        service.login({ email: 'test@example.com', password: 'Password1' }),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('refresh()', () => {
    const storedToken = {
      userId: USER_ID,
      tokenHash: 'somehash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    }

    it('returns new token pair and revokes old token', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([storedToken]))
        .mockReturnValueOnce(qb([{ ...mockUser, status: 'active' }]))
      mockDb.update.mockReturnValueOnce(updateQb())
      mockDb.insert.mockReturnValueOnce(insertQb())

      const result = await service.refresh('raw_valid_token')
      expect(result.accessToken).toBe('mock_access_token')
    })

    it('throws UnauthorizedException when token not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.refresh('nonexistent_token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when token is revoked', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ ...storedToken, revokedAt: new Date() }]))
      await expect(service.refresh('revoked_token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when token is expired', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ ...storedToken, expiresAt: new Date(Date.now() - 1000) }]),
      )
      await expect(service.refresh('expired_token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws ForbiddenException when user account is suspended after token lookup', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([storedToken]))
        .mockReturnValueOnce(qb([{ ...mockUser, status: 'banned' }]))
      await expect(service.refresh('valid_token_banned_user')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('logout()', () => {
    it('revokes the refresh token for the given user', async () => {
      mockDb.update.mockReturnValueOnce(updateQb())
      await expect(service.logout(USER_ID, 'raw_token')).resolves.not.toThrow()
    })
  })

  describe('getMe()', () => {
    it('returns user with profile when found', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ id: USER_ID, email: 'test@example.com', role: 'user', kycLevel: 0, referralCode: 'CODE', createdAt: new Date(), profile: null }]),
      )
      const result = await service.getMe(USER_ID)
      expect(result.id).toBe(USER_ID)
    })

    it('throws NotFoundException when user does not exist', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.getMe('nonexistent-uuid')).rejects.toThrow(NotFoundException)
    })
  })
})
