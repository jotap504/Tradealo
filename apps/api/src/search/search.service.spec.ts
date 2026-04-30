import { Test, TestingModule } from '@nestjs/testing'
import { SearchService, type ListingDocument } from './search.service'
import { ELASTICSEARCH_TOKEN } from './search.module'
import { SearchSort } from './dto/search-listings.dto'

const mockEs = {
  index: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  indices: {
    exists: jest.fn(),
    create: jest.fn(),
  },
}

const baseListing: ListingDocument = {
  id: 'listing-001',
  title: 'iPhone 13 Pro',
  description: 'Excelente estado con caja original',
  price: 150000,
  currency: 'ARS',
  condition: 'used',
  type: 'standard',
  status: 'active',
  moderationStatus: 'approved',
  categoryId: 'cat-smartphones',
  province: 'Buenos Aires',
  city: 'CABA',
  createdAt: '2026-01-15T00:00:00Z',
}

function makeEsResponse(hits: object[], total = hits.length) {
  return {
    hits: {
      total: { value: total, relation: 'eq' },
      hits: hits.map((h, i) => ({
        _source: h,
        _score: 1.5 - i * 0.1,
        sort: [`2026-01-${15 - i}T00:00:00Z`, `listing-00${i + 1}`],
      })),
    },
  }
}

describe('SearchService', () => {
  let service: SearchService

  beforeEach(async () => {
    jest.resetAllMocks()
    mockEs.delete.mockResolvedValue({})
    mockEs.index.mockResolvedValue({})
    mockEs.indices.exists.mockResolvedValue(false)
    mockEs.indices.create.mockResolvedValue({})

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ELASTICSEARCH_TOKEN, useValue: mockEs },
      ],
    }).compile()

    service = module.get<SearchService>(SearchService)
  })

  describe('indexListing()', () => {
    it('calls es.index with correct index and document', async () => {
      await service.indexListing(baseListing)
      expect(mockEs.index).toHaveBeenCalledWith({
        index: 'listings',
        id: baseListing.id,
        document: baseListing,
      })
    })
  })

  describe('deleteListing()', () => {
    it('calls es.delete with correct index and id', async () => {
      await service.deleteListing('listing-001')
      expect(mockEs.delete).toHaveBeenCalledWith({ index: 'listings', id: 'listing-001' })
    })

    it('swallows errors silently when document not found', async () => {
      mockEs.delete.mockRejectedValue(new Error('Not found'))
      await expect(service.deleteListing('nonexistent')).resolves.not.toThrow()
    })
  })

  describe('search()', () => {
    it('returns listings with hasMore=false when results fit in page', async () => {
      mockEs.search.mockResolvedValue(makeEsResponse([baseListing]))
      const result = await service.search({ q: 'iPhone' })
      expect(result.data).toHaveLength(1)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('returns hasMore=true and cursor when more results exist', async () => {
      const hits = Array.from({ length: 21 }, (_, i) => ({ ...baseListing, id: `listing-${i}` }))
      mockEs.search.mockResolvedValue(makeEsResponse(hits))
      const result = await service.search({ limit: 20 })
      expect(result.data).toHaveLength(20)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).not.toBeNull()
    })

    it('applies geo_distance filter when lat/lng/radiusKm provided', async () => {
      mockEs.search.mockResolvedValue(makeEsResponse([baseListing]))
      await service.search({ lat: -34.6, lng: -58.4, radiusKm: 10 })
      const call = mockEs.search.mock.calls[0][0]
      const filter = call.query.bool.filter
      expect(filter.some((f: object) => 'geo_distance' in f)).toBe(true)
    })

    it('applies price range filter', async () => {
      mockEs.search.mockResolvedValue(makeEsResponse([]))
      await service.search({ minPrice: 1000, maxPrice: 200000 })
      const call = mockEs.search.mock.calls[0][0]
      const filter = call.query.bool.filter
      const rangeFilter = filter.find((f: { range?: unknown }) => f.range)
      expect(rangeFilter.range.price.gte).toBe(1000)
      expect(rangeFilter.range.price.lte).toBe(200000)
    })

    it('sorts by price ascending when sort=price_asc', async () => {
      mockEs.search.mockResolvedValue(makeEsResponse([baseListing]))
      await service.search({ sort: SearchSort.PRICE_ASC })
      const call = mockEs.search.mock.calls[0][0]
      expect(call.sort[0]).toEqual({ price: 'asc' })
    })

    it('sorts by price descending when sort=price_desc', async () => {
      mockEs.search.mockResolvedValue(makeEsResponse([baseListing]))
      await service.search({ sort: SearchSort.PRICE_DESC })
      const call = mockEs.search.mock.calls[0][0]
      expect(call.sort[0]).toEqual({ price: 'desc' })
    })

    it('uses search_after when cursor is provided', async () => {
      mockEs.search.mockResolvedValue(makeEsResponse([baseListing]))
      const cursor = Buffer.from(JSON.stringify(['2026-01-10T00:00:00Z', 'listing-x'])).toString('base64url')
      await service.search({ cursor })
      const call = mockEs.search.mock.calls[0][0]
      expect(call.search_after).toBeDefined()
    })

    it('filters by categoryId', async () => {
      mockEs.search.mockResolvedValue(makeEsResponse([]))
      await service.search({ categoryId: 'cat-smartphones' })
      const call = mockEs.search.mock.calls[0][0]
      const filter = call.query.bool.filter
      expect(filter.some((f: { term?: { categoryId?: string } }) => f.term?.categoryId === 'cat-smartphones')).toBe(true)
    })

    it('returns total hit count', async () => {
      mockEs.search.mockResolvedValue(makeEsResponse([baseListing], 42))
      const result = await service.search({})
      expect(result.total).toBe(42)
    })
  })

  describe('ensureIndex()', () => {
    it('creates index when it does not exist', async () => {
      mockEs.indices.exists.mockResolvedValue(false)
      await service.ensureIndex()
      expect(mockEs.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'listings' }),
      )
    })

    it('skips creation when index already exists', async () => {
      mockEs.indices.exists.mockResolvedValue(true)
      await service.ensureIndex()
      expect(mockEs.indices.create).not.toHaveBeenCalled()
    })
  })
})
