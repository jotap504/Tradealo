import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListingsService } from '../listings/listings.service';
import { CategoriesService } from '../categories/categories.service';
import { ShopService } from '../shop/shop.service';
import type { ListListingsDto } from '../listings/dto/list-listings.dto';

const searchListingsShape = {
  query: z
    .string()
    .optional()
    .describe('Free-text search term (matches title and description)'),
  category: z.string().optional().describe('Category UUID or slug'),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  currency: z.enum(['ARS', 'USD']).optional(),
  sort: z
    .enum(['recent', 'price_asc', 'price_desc', 'popular'])
    .optional()
    .describe('Sort order; defaults to recent'),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor returned from a previous call'),
};

interface SearchListingsArgs {
  query?: string;
  category?: string;
  condition?: 'new' | 'used' | 'refurbished';
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  province?: string;
  currency?: 'ARS' | 'USD';
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'popular';
  limit?: number;
  cursor?: string;
}

@Injectable()
export class McpPublicService {
  private readonly logger = new Logger(McpPublicService.name);

  constructor(
    private readonly listingsService: ListingsService,
    private readonly categoriesService: CategoriesService,
    private readonly shopService: ShopService,
  ) {}

  buildServer(): McpServer {
    const server = new McpServer({
      name: 'trocalia-public',
      version: '0.1.0',
    });

    server.registerTool(
      'search_listings',
      {
        description:
          'Searches the Trocalia public catalog. Returns a paginated list of active listings ' +
          'matching the given filters. Use the cursor field to fetch subsequent pages.',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: searchListingsShape as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: SearchListingsArgs) =>
        this.wrap('search_listings', () => this.searchListings(args))) as any,
    );

    server.registerTool(
      'get_listing',
      {
        description: 'Returns the full detail of a listing by its UUID.',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: { id: z.string().describe('Listing UUID') } as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: { id: string }) =>
        this.wrap('get_listing', () => this.getListing(args.id))) as any,
    );

    server.registerTool(
      'list_categories',
      {
        description:
          'Returns the full hierarchical category tree (id, slug, name, children).',
        inputSchema: {},
      },
      async () =>
        this.wrap('list_categories', async () =>
          this.categoriesService.getTree(),
        ),
    );

    server.registerTool(
      'get_shop',
      {
        description:
          'Returns public information about a seller shop identified by username or slug.',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: {
          identifier: z.string().describe('Shop username or slug'),
        } as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: { identifier: string }) =>
        this.wrap('get_shop', () => this.getShop(args.identifier))) as any,
    );

    return server;
  }

  // ─── Tool implementations ───────────────────────────────────────────────

  private async searchListings(args: SearchListingsArgs) {
    const dto: ListListingsDto = {
      limit: args.limit ?? 20,
      cursor: args.cursor,
      q: args.query,
      categoryId: args.category,
      condition: args.condition,
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      city: args.city,
      province: args.province,
      currency: args.currency,
      sort: args.sort,
    } as ListListingsDto;

    const { data, nextCursor, hasMore } =
      await this.listingsService.findAll(dto);
    return {
      total: data.length,
      hasMore,
      nextCursor,
      listings: data.map((l) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        currency: l.currency,
        condition: l.condition,
        city: l.city,
        province: l.province,
        url: this.listingUrl(l.id),
      })),
    };
  }

  private async getListing(id: string) {
    const listing = await this.listingsService.findOne(id);
    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      currency: listing.currency,
      condition: listing.condition,
      city: listing.city,
      province: listing.province,
      images: (listing.images ?? []).map((i) => i.url),
      url: this.listingUrl(listing.id),
      seller: listing.seller,
      agentPurchasable: listing.agentPurchasable,
    };
  }

  private async getShop(identifier: string) {
    try {
      return await this.shopService.getPublicShop(identifier);
    } catch {
      return {
        error: `Shop not found by identifier "${identifier}". Try using the shop's username or slug.`,
      };
    }
  }

  private async wrap<T>(
    tool: string,
    fn: () => Promise<T>,
  ): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: true;
  }> {
    try {
      const result = await fn();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = (err as Error).message ?? 'Unknown error';
      this.logger.warn(`MCP public tool ${tool} failed: ${message}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  }

  private listingUrl(id: string): string {
    const base = (process.env.APP_URL ?? 'https://trocalia.com.ar').replace(
      /\/$/,
      '',
    );
    return `${base}/listing/${id}`;
  }
}
