import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { ListingImagesService } from './listing-images.service'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { StorageService } from '../storage/storage.service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qb(result: unknown): any {
  const chain: any = {}
  ;['from', 'where', 'limit', 'orderBy', 'returning'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  chain.catch = () => Promise.resolve(result)
  return chain
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertQb(result: unknown = []): any {
  const returning = jest.fn().mockResolvedValue(result)
  const values = jest.fn().mockReturnValue({ returning })
  return { values }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateQb(): any {
  const returning = jest.fn().mockResolvedValue([])
  const where = jest.fn().mockReturnValue({ returning })
  const set = jest.fn().mockReturnValue({ where })
  return { set }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deleteQb(): any {
  const where = jest.fn().mockResolvedValue([])
  return { where }
}

const USER_ID = 'user-uuid-001'
const LISTING_ID = 'listing-uuid-001'
const IMAGE_ID = 'image-uuid-001'

const mockListing = { id: LISTING_ID, userId: USER_ID, type: 'standard' }
const mockImage = {
  id: IMAGE_ID,
  listingId: LISTING_ID,
  url: 'https://cdn.example.com/listings/listing-uuid-001/123.jpg',
  r2Key: `listings/${LISTING_ID}/123.jpg`,
  sortOrder: 0,
  isPrimary: true,
}

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockStorage = {
  getPresignedPut: jest.fn(),
  getPublicUrl: jest.fn(),
  deleteObject: jest.fn(),
}

describe('ListingImagesService', () => {
  let service: ListingImagesService

  beforeEach(async () => {
    jest.resetAllMocks()
    mockStorage.getPresignedPut.mockResolvedValue({ uploadUrl: 'https://r2.example.com/put', key: 'listings/listing-uuid-001/ts.jpg', expiresIn: 300 })
    mockStorage.getPublicUrl.mockReturnValue('https://cdn.example.com/listings/listing-uuid-001/123.jpg')
    mockStorage.deleteObject.mockResolvedValue(undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingImagesService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile()

    service = module.get<ListingImagesService>(ListingImagesService)
  })

  describe('getUploadUrl()', () => {
    it('returns presigned PUT url for valid owner below max images', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockListing]))          // assertOwner
        .mockReturnValueOnce(qb([{ total: 3 }]))         // assertBelowMaxImages → countImages

      const result = await service.getUploadUrl(USER_ID, LISTING_ID)
      expect(result.uploadUrl).toBeDefined()
      expect(mockStorage.getPresignedPut).toHaveBeenCalledWith(
        expect.stringMatching(`listings/${LISTING_ID}/`),
        'image/jpeg',
      )
    })

    it('throws NotFoundException when listing not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]))
      await expect(service.getUploadUrl(USER_ID, LISTING_ID)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when not owner', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ ...mockListing, userId: 'other-user' }]))
      await expect(service.getUploadUrl(USER_ID, LISTING_ID)).rejects.toThrow(ForbiddenException)
    })

    it('throws BadRequestException when standard listing has reached max images (10)', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockListing]))
        .mockReturnValueOnce(qb([{ total: 10 }]))
      await expect(service.getUploadUrl(USER_ID, LISTING_ID)).rejects.toThrow(BadRequestException)
    })

    it('allows up to 20 images for premium listing', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([{ ...mockListing, type: 'premium' }]))
        .mockReturnValueOnce(qb([{ total: 19 }]))
      const result = await service.getUploadUrl(USER_ID, LISTING_ID)
      expect(result).toBeDefined()
    })

    it('throws BadRequestException when premium listing has reached max images (20)', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([{ ...mockListing, type: 'premium' }]))
        .mockReturnValueOnce(qb([{ total: 20 }]))
      await expect(service.getUploadUrl(USER_ID, LISTING_ID)).rejects.toThrow(BadRequestException)
    })
  })

  describe('confirmUpload()', () => {
    const dto = { key: `listings/${LISTING_ID}/123.jpg` }

    it('inserts image record and returns it', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockListing]))
        .mockReturnValueOnce(qb([{ total: 0 }]))   // assertBelowMaxImages
        .mockReturnValueOnce(qb([{ total: 0 }]))   // countImages for isPrimary
      mockDb.insert.mockReturnValueOnce(insertQb([mockImage]))

      const result = await service.confirmUpload(USER_ID, LISTING_ID, dto)
      expect(result.id).toBe(IMAGE_ID)
      expect(result.isPrimary).toBe(true)
    })

    it('sets isPrimary=false when images already exist', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockListing]))
        .mockReturnValueOnce(qb([{ total: 2 }]))   // assertBelowMaxImages
        .mockReturnValueOnce(qb([{ total: 2 }]))   // countImages for isPrimary
      mockDb.insert.mockReturnValueOnce(insertQb([{ ...mockImage, isPrimary: false }]))

      const result = await service.confirmUpload(USER_ID, LISTING_ID, dto)
      expect(result.isPrimary).toBe(false)
    })

    it('throws BadRequestException when key does not match listing', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockListing]))
        .mockReturnValueOnce(qb([{ total: 0 }]))  // assertBelowMaxImages
      await expect(
        service.confirmUpload(USER_ID, LISTING_ID, { key: 'listings/other-listing/hack.jpg' }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('reorder()', () => {
    it('updates sortOrder and isPrimary for each imageId', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockListing]))
      mockDb.update.mockReturnValue(updateQb())
      mockDb.select.mockReturnValueOnce(qb([mockImage]))

      const result = await service.reorder(USER_ID, LISTING_ID, { imageIds: [IMAGE_ID] })
      expect(Array.isArray(result)).toBe(true)
      expect(mockDb.update).toHaveBeenCalledTimes(1)
    })

    it('throws ForbiddenException when not owner', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ ...mockListing, userId: 'other-user' }]))
      await expect(service.reorder(USER_ID, LISTING_ID, { imageIds: [IMAGE_ID] })).rejects.toThrow(ForbiddenException)
    })
  })

  describe('remove()', () => {
    it('deletes image from storage and database', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockListing]))   // assertOwner
        .mockReturnValueOnce(qb([mockImage]))     // fetch image
      mockDb.delete.mockReturnValueOnce(deleteQb())

      await expect(service.remove(USER_ID, LISTING_ID, IMAGE_ID)).resolves.not.toThrow()
      expect(mockStorage.deleteObject).toHaveBeenCalledWith(mockImage.r2Key)
    })

    it('throws NotFoundException when image not found', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockListing]))
        .mockReturnValueOnce(qb([]))
      await expect(service.remove(USER_ID, LISTING_ID, IMAGE_ID)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when not owner', async () => {
      mockDb.select.mockReturnValueOnce(qb([{ ...mockListing, userId: 'other-user' }]))
      await expect(service.remove(USER_ID, LISTING_ID, IMAGE_ID)).rejects.toThrow(ForbiddenException)
    })
  })
})
