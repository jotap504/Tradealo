import { Test, TestingModule } from '@nestjs/testing'
import { HttpException } from '@nestjs/common'
import { AiService } from './ai.service'
import { REDIS_TOKEN } from '../redis/redis.module'
import { ConfigService } from '../config/config.service'

const mockRedis = {
  get: jest.fn(),
  multi: jest.fn(),
}

const mockConfigService = {
  getNumber: jest.fn(),
}

const mockFetch = jest.fn()

const USER_ID = 'user-uuid-001'

function makeApiResponse(content: string) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue({
      choices: [{ message: { content } }],
    }),
  }
}

describe('AiService', () => {
  let service: AiService

  beforeEach(async () => {
    jest.resetAllMocks()
    mockConfigService.getNumber.mockResolvedValue(3)
    mockRedis.get.mockResolvedValue('0')
    mockRedis.multi.mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })

    global.fetch = mockFetch as unknown as typeof fetch

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: REDIS_TOKEN, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<AiService>(AiService)
  })

  describe('generateListing()', () => {
    const dto = { prompt: 'iPhone 13 Pro en excelente estado con caja original' }

    const validJson = JSON.stringify({
      title: 'iPhone 13 Pro 256GB Gris espacial',
      description: 'Perfecto estado, batería 95%, con accesorios originales',
      suggestedTags: ['iPhone', 'Apple', 'smartphone'],
    })

    it('returns generated listing content', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(validJson))

      const result = await service.generateListing(USER_ID, dto)
      expect(result.title).toBe('iPhone 13 Pro 256GB Gris espacial')
      expect(result.description).toContain('Perfecto estado')
      expect(result.suggestedTags).toHaveLength(3)
    })

    it('throws 429 when daily limit is reached', async () => {
      mockRedis.get.mockResolvedValue('3')

      await expect(service.generateListing(USER_ID, dto)).rejects.toThrow(HttpException)
      await expect(service.generateListing(USER_ID, dto)).rejects.toMatchObject({
        status: 429,
      })
    })

    it('throws 502 when AI API returns non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' })

      await expect(service.generateListing(USER_ID, dto)).rejects.toMatchObject({ status: 502 })
    })

    it('throws 502 when AI response has no content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [] }),
      })

      await expect(service.generateListing(USER_ID, dto)).rejects.toMatchObject({ status: 502 })
    })

    it('throws 502 when AI response content is not valid JSON', async () => {
      mockFetch.mockResolvedValue(makeApiResponse('not-valid-json'))

      await expect(service.generateListing(USER_ID, dto)).rejects.toMatchObject({ status: 502 })
    })

    it('truncates title to 80 chars and suggestedTags to 5', async () => {
      const longJson = JSON.stringify({
        title: 'A'.repeat(120),
        description: 'desc',
        suggestedTags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      })
      mockFetch.mockResolvedValue(makeApiResponse(longJson))

      const result = await service.generateListing(USER_ID, dto)
      expect(result.title.length).toBeLessThanOrEqual(80)
      expect(result.suggestedTags.length).toBeLessThanOrEqual(5)
    })

    it('increments redis counter after successful generation', async () => {
      mockFetch.mockResolvedValue(makeApiResponse(validJson))
      const execMock = jest.fn().mockResolvedValue([])
      mockRedis.multi.mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: execMock,
      })

      await service.generateListing(USER_ID, dto)
      expect(execMock).toHaveBeenCalled()
    })
  })

  describe('getRemainingQuota()', () => {
    it('returns correct remaining quota', async () => {
      mockRedis.get.mockResolvedValue('1')
      mockConfigService.getNumber.mockResolvedValue(3)

      const result = await service.getRemainingQuota(USER_ID)
      expect(result.used).toBe(1)
      expect(result.limit).toBe(3)
      expect(result.remaining).toBe(2)
    })

    it('returns 0 remaining when limit exceeded', async () => {
      mockRedis.get.mockResolvedValue('5')
      mockConfigService.getNumber.mockResolvedValue(3)

      const result = await service.getRemainingQuota(USER_ID)
      expect(result.remaining).toBe(0)
    })
  })
})
