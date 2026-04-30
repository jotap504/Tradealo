import { Injectable, Inject } from '@nestjs/common'
import { Client } from '@elastic/elasticsearch'
import type {
  Sort, FieldValue, QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types'
import { ELASTICSEARCH_TOKEN } from './search.module'
import type { SearchListingsDto } from './dto/search-listings.dto'
import { SearchSort } from './dto/search-listings.dto'

const INDEX = 'listings'
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export interface ListingDocument {
  id: string
  title: string
  description: string
  price: number
  currency: string
  condition: string
  type: string
  status: string
  moderationStatus: string
  categoryId: string
  province?: string
  city?: string
  location?: { lat: number; lon: number }
  primaryImageUrl?: string
  publishedAt?: string
  createdAt: string
}

export interface SearchResult {
  data: (ListingDocument & { score?: number })[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

@Injectable()
export class SearchService {
  constructor(@Inject(ELASTICSEARCH_TOKEN) private readonly es: Client) {}

  async indexListing(doc: ListingDocument): Promise<void> {
    await this.es.index({
      index: INDEX,
      id: doc.id,
      document: doc,
    })
  }

  async deleteListing(id: string): Promise<void> {
    await this.es.delete({ index: INDEX, id }).catch(() => {})
  }

  async search(dto: SearchListingsDto): Promise<SearchResult> {
    const limit = Math.min(dto.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

    const must: QueryDslQueryContainer[] = [
      { term: { status: 'active' } },
      { term: { moderationStatus: 'approved' } },
    ]

    if (dto.q) {
      must.push({
        multi_match: {
          query: dto.q,
          fields: ['title^2', 'description'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      })
    }

    const filter: QueryDslQueryContainer[] = []
    if (dto.categoryId) filter.push({ term: { categoryId: dto.categoryId } })
    if (dto.condition) filter.push({ term: { condition: dto.condition } })
    if (dto.province) filter.push({ term: { province: dto.province } })
    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      filter.push({
        range: {
          price: {
            ...(dto.minPrice !== undefined && { gte: dto.minPrice }),
            ...(dto.maxPrice !== undefined && { lte: dto.maxPrice }),
          },
        },
      })
    }
    if (dto.lat !== undefined && dto.lng !== undefined && dto.radiusKm) {
      filter.push({
        geo_distance: {
          distance: `${dto.radiusKm}km`,
          location: { lat: dto.lat, lon: dto.lng },
        },
      })
    }

    const sort = this.buildSort(dto.sort, dto.lat, dto.lng)
    const searchAfter = dto.cursor ? this.decodeCursor(dto.cursor) : undefined

    const response = await this.es.search<ListingDocument>({
      index: INDEX,
      size: limit + 1,
      query: { bool: { must, filter } },
      sort,
      ...(searchAfter && { search_after: searchAfter as FieldValue[] }),
      track_total_hits: true,
    })

    const hits = response.hits.hits
    const hasMore = hits.length > limit
    const data = hasMore ? hits.slice(0, limit) : hits

    const total = typeof response.hits.total === 'object'
      ? response.hits.total.value
      : (response.hits.total ?? 0)

    const lastHit = data[data.length - 1]
    const nextCursor = hasMore && lastHit?.sort
      ? this.encodeCursor(lastHit.sort as unknown[])
      : null

    return {
      data: data.map((hit) => ({ ...hit._source!, score: hit._score ?? undefined })),
      nextCursor,
      hasMore,
      total,
    }
  }

  async ensureIndex(): Promise<void> {
    const exists = await this.es.indices.exists({ index: INDEX })
    if (exists) return

    await this.es.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'spanish' },
          description: { type: 'text', analyzer: 'spanish' },
          price: { type: 'scaled_float', scaling_factor: 100 },
          currency: { type: 'keyword' },
          condition: { type: 'keyword' },
          type: { type: 'keyword' },
          status: { type: 'keyword' },
          moderationStatus: { type: 'keyword' },
          categoryId: { type: 'keyword' },
          province: { type: 'keyword' },
          city: { type: 'keyword' },
          location: { type: 'geo_point' },
          primaryImageUrl: { type: 'keyword', index: false },
          publishedAt: { type: 'date' },
          createdAt: { type: 'date' },
        },
      },
    })
  }

  private buildSort(sort?: SearchSort, lat?: number, lng?: number): Sort {
    if (sort === SearchSort.PRICE_ASC) return [{ price: 'asc' }, { createdAt: 'desc' }]
    if (sort === SearchSort.PRICE_DESC) return [{ price: 'desc' }, { createdAt: 'desc' }]
    if (sort === SearchSort.RECENT) return [{ createdAt: 'desc' }, { id: 'desc' }]
    if (lat !== undefined && lng !== undefined) {
      return [
        { _geo_distance: { location: { lat, lon: lng }, order: 'asc', unit: 'km' } },
        { createdAt: 'desc' },
      ]
    }
    return [{ _score: { order: 'desc' as const } }, { createdAt: 'desc' as const }]
  }

  private encodeCursor(sortValues: unknown[]): string {
    return Buffer.from(JSON.stringify(sortValues)).toString('base64url')
  }

  private decodeCursor(cursor: string): unknown[] {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as unknown[]
    } catch {
      return []
    }
  }
}
