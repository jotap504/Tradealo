import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { UsersService } from './users.service'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { StorageService } from '../storage/storage.service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qb(result: unknown): any {
  const chain: any = {}
  ;['from', 'where', 'limit', 'leftJoin', 'onConflictDoUpdate', 'onConflictDoNothing'].forEach(
    (m) => { chain[m] = jest.fn().mockReturnValue(chain) },
  )
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
function insertQb(): any {
  const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined)
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate })
  return { values }
}

const USER_ID = 'user-uuid-001'

const mockUser = {
  id: USER_ID,
  email: 'test@example.com',
  phone: null,
  role: 'user',
  status: 'active',
  kycLevel: 0,
  emailVerified: true,
  phoneVerified: false,
  referralCode: 'CODE123456AB',
  createdAt: new Date(),
}

const mockProfile = {
  userId: USER_ID,
  username: 'testuser',
  firstName: 'Juan',
  lastName: 'Pérez',
  avatarUrl: null,
  bio: 'Hola',
  whatsapp: null,
  showPhone: false,
  province: 'Buenos Aires',
  city: 'CABA',
  completenessPct: 50,
  updatedAt: new Date(),
}

const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
}

const mockStorage = {
  getPresignedPut: jest.fn().mockResolvedValue({
    uploadUrl: 'https://r2.example.com/upload',
    key: 'avatars/user-uuid-001/file.jpg',
    expiresIn: 300,
  }),
  getPublicUrl: jest.fn().mockReturnValue('https://cdn.example.com/avatars/user-uuid-001/file.jpg'),
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(async () => {
    jest.resetAllMocks()
    mockStorage.getPresignedPut.mockResolvedValue({
      uploadUrl: 'https://r2.example.com/upload',
      key: 'avatars/user-uuid-001/file.jpg',
      expiresIn: 300,
    })
    mockStorage.getPublicUrl.mockReturnValue('https://cdn.example.com/avatars/user-uuid-001/file.jpg')

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  describe('getMyProfile()', () => {
    it('returns full profile when user exists', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ ...mockUser, profile: mockProfile, reputation: null }]),
      )
      const result = await service.getMyProfile(USER_ID)
      expect(result.id).toBe(USER_ID)
      expect(result.profile).toEqual(mockProfile)
    })

    it('throws NotFoundException when user not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.getMyProfile(USER_ID)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getPublicProfile()', () => {
    it('returns public profile for active user', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ id: USER_ID, role: 'user', kycLevel: 0, createdAt: new Date(), reputation: null }]),
      )
      const result = await service.getPublicProfile(USER_ID)
      expect(result.id).toBe(USER_ID)
    })

    it('throws NotFoundException when user not found or inactive', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.getPublicProfile('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateProfile()', () => {
    it('updates profile fields and recalculates completeness', async () => {
      // no username in dto → only one select (user data)
      mockDb.select
        .mockReturnValueOnce(qb([{ emailVerified: true, phoneVerified: false, kycLevel: 0 }]))
      mockDb.update
        .mockReturnValueOnce(updateQb([{ ...mockProfile, firstName: 'Nuevo' }]))
        .mockReturnValueOnce(updateQb([{ completenessPct: 55 }]))

      const result = await service.updateProfile(USER_ID, { firstName: 'Nuevo' })
      expect(result.firstName).toBe('Nuevo')
    })

    it('throws ConflictException when username is already taken', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ id: 'other-user-uuid' }]))
      await expect(
        service.updateProfile(USER_ID, { username: 'taken' }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException when userProfile not found', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([]))  // username check
        .mockReturnValueOnce(qb([{ emailVerified: true, phoneVerified: false, kycLevel: 0 }]))
      mockDb.update.mockReturnValueOnce(updateQb([]))
      await expect(service.updateProfile(USER_ID, { bio: 'test' })).rejects.toThrow(NotFoundException)
    })

    it('calculates completeness correctly with full profile', async () => {
      // no username in dto → only one select (user data)
      mockDb.select
        .mockReturnValueOnce(qb([{ emailVerified: true, phoneVerified: true, kycLevel: 2 }]))
      const fullProfile = { ...mockProfile, avatarUrl: 'url', bio: 'bio', whatsapp: '+54911' }
      mockDb.update
        .mockReturnValueOnce(updateQb([fullProfile]))
        .mockReturnValueOnce(updateQb([{ completenessPct: 100 }]))

      const result = await service.updateProfile(USER_ID, { bio: 'bio' })
      // emailVerified(15) + name(15) + avatar(15) + bio(10) + phoneVerified(10) + province(10) + whatsapp(5) + kycLevel>=2(20) = 100
      expect(result.completenessPct).toBe(100)
    })
  })

  describe('getAvatarUploadUrl()', () => {
    it('returns presigned POST for avatar upload', async () => {
      const result = await service.getAvatarUploadUrl(USER_ID)
      expect(result.uploadUrl).toContain('r2.example.com')
      expect(mockStorage.getPresignedPut).toHaveBeenCalledWith(
        expect.stringContaining(`avatars/${USER_ID}/`),
        'image/jpeg',
      )
    })
  })

  describe('confirmAvatarUpload()', () => {
    it('updates avatarUrl with public URL', async () => {
      const key = `avatars/${USER_ID}/file.jpg`
      mockDb.update.mockReturnValueOnce(
        updateQb([{ avatarUrl: 'https://cdn.example.com/avatars/user-uuid-001/file.jpg' }]),
      )
      const result = await service.confirmAvatarUpload(USER_ID, key)
      expect(result.avatarUrl).toContain('cdn.example.com')
    })

    it('throws BadRequestException for key not belonging to user', async () => {
      await expect(
        service.confirmAvatarUpload(USER_ID, 'avatars/other-user/file.jpg'),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws NotFoundException when profile not found', async () => {
      mockDb.update.mockReturnValueOnce(updateQb([]))
      await expect(
        service.confirmAvatarUpload(USER_ID, `avatars/${USER_ID}/file.jpg`),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getKycUploadUrl()', () => {
    it('returns presigned POST for dni upload', async () => {
      mockDb.insert.mockReturnValueOnce(insertQb())
      const result = await service.getKycUploadUrl(USER_ID, 'dni')
      expect(result.uploadUrl).toContain('r2.example.com')
      expect(mockStorage.getPresignedPut).toHaveBeenCalledWith(
        expect.stringContaining(`kyc/${USER_ID}/dni/`),
        'application/pdf',
      )
    })

    it('returns presigned PUT for selfie (image/jpeg)', async () => {
      mockDb.insert.mockReturnValueOnce(insertQb())
      await service.getKycUploadUrl(USER_ID, 'selfie')
      expect(mockStorage.getPresignedPut).toHaveBeenCalledWith(
        expect.any(String),
        'image/jpeg',
      )
    })

    it('throws BadRequestException for invalid KYC type', async () => {
      await expect(service.getKycUploadUrl(USER_ID, 'passport')).rejects.toThrow(BadRequestException)
    })
  })
})
