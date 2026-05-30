import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { agentActions, sellerShops } from '../database/schema';
import { ListingsService } from '../listings/listings.service';
import { ListingImagesService } from '../listings/listing-images.service';
import { CategoriesService } from '../categories/categories.service';
import type {
  CreateListingDto,
  ListingType,
  ListingCondition,
  Currency,
  SaleType,
} from '../listings/dto/create-listing.dto';
import type { VerifiedToken } from '../api-tokens/api-tokens.service';

type DB = NodePgDatabase<typeof schema>;

interface CreateListingArgs {
  title: string;
  description: string;
  price: number;
  currency?: 'ARS' | 'USD';
  category: string;
  condition?: 'new' | 'used' | 'refurbished';
  priceNegotiable?: boolean;
  saleType?: 'contact' | 'stock';
  city?: string;
  province?: string;
  paymentMethods?: string[];
  shippingOptions?: string[];
  photosBase64?: Array<{
    data: string;
    mime: 'image/jpeg' | 'image/png' | 'image/webp';
  }>;
}

const createListingShape = {
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(5000),
  price: z.number().positive(),
  currency: z.enum(['ARS', 'USD']).default('ARS'),
  category: z
    .string()
    .describe('Category UUID or slug (use list_categories to discover)'),
  condition: z.enum(['new', 'used', 'refurbished']).default('used'),
  priceNegotiable: z.boolean().default(true),
  saleType: z.enum(['contact', 'stock']).default('contact'),
  city: z.string().max(100).optional(),
  province: z.string().max(50).optional(),
  paymentMethods: z.array(z.string()).optional(),
  shippingOptions: z.array(z.string()).optional(),
  photosBase64: z
    .array(
      z.object({
        data: z.string().describe('Base64-encoded image bytes (no data: prefix)'),
        mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
      }),
    )
    .max(8)
    .optional()
    .describe('Up to 8 images, each <= 8MB raw'),
};

@Injectable()
export class McpShopService {
  private readonly logger = new Logger(McpShopService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly listingsService: ListingsService,
    private readonly listingImagesService: ListingImagesService,
    private readonly categoriesService: CategoriesService,
  ) {}

  /** Builds an MCP server bound to the verified token's owner. */
  buildServer(token: VerifiedToken): McpServer {
    const server = new McpServer({
      name: 'trocalia-shop',
      version: '0.1.0',
    });

    server.registerTool(
      'get_shop_info',
      {
        description:
          'Returns the seller shop details for the authenticated user (shop name, slug, and whether agent-created listings auto-publish).',
        inputSchema: {},
      },
      async () =>
        this.wrap(token, 'get_shop_info', undefined, () =>
          this.getShopInfo(token.userId),
        ),
    );

    server.registerTool(
      'list_categories',
      {
        description:
          'Lists the full category tree so you can choose the right category UUID or slug for a new listing.',
        inputSchema: {},
      },
      async () =>
        this.wrap(token, 'list_categories', undefined, async () => {
          const tree = await this.categoriesService.getTree();
          return tree;
        }),
    );

    server.registerTool(
      'create_listing',
      {
        description:
          "Publishes a new product listing for the authenticated seller. " +
          "If the shop's auto_publish_via_agent toggle is OFF, the listing is created " +
          "as a DRAFT — you MUST tell the user it is awaiting their review at /my-shop/listings. " +
          'Photos are uploaded and attached automatically.',
        // MCP SDK 1.x ships its own zod-compat shim that doesn't unify cleanly with
        // an external zod v3 schema in TS. Runtime is fine — cast for the type check.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: createListingShape as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: CreateListingArgs) =>
        this.wrap(token, 'create_listing', summarize(args), () =>
          this.createListing(token.userId, args),
        )) as any,
    );

    server.registerTool(
      'list_my_listings',
      {
        description:
          'Lists listings owned by the authenticated user. Useful to confirm what was just created.',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: {
          status: z
            .enum(['draft', 'active', 'sold', 'expired'])
            .optional()
            .describe('Filter by status; omit to return all.'),
          limit: z.number().int().min(1).max(50).default(20),
        } as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: { status?: string; limit?: number }) =>
        this.wrap(token, 'list_my_listings', summarize(args), () =>
          this.listMyListings(token.userId, args.status, args.limit ?? 20),
        )) as any,
    );

    return server;
  }

  // ─── Tool implementations ────────────────────────────────────────────────

  private async getShopInfo(userId: string) {
    const [shop] = await this.db
      .select({
        id: sellerShops.id,
        shopName: sellerShops.shopName,
        slug: sellerShops.slug,
        isPublished: sellerShops.isPublished,
        autoPublishViaAgent: sellerShops.autoPublishViaAgent,
      })
      .from(sellerShops)
      .where(eq(sellerShops.userId, userId))
      .limit(1);
    if (!shop) {
      return {
        hasShop: false,
        message:
          'This user has no seller shop yet. They need an active Shop subscription before agents can create listings.',
      };
    }
    return {
      hasShop: true,
      shopId: shop.id,
      shopName: shop.shopName,
      slug: shop.slug,
      isPublished: shop.isPublished,
      autoPublishViaAgent: shop.autoPublishViaAgent,
      listingAutoPublishBehavior: shop.autoPublishViaAgent
        ? 'Listings you create will be published immediately.'
        : 'Listings you create will be saved as DRAFTS — the seller must review and publish them at /my-shop/listings.',
    };
  }

  private async createListing(userId: string, args: CreateListingArgs) {
    const categoryId = await this.resolveCategoryId(args.category);

    const dto = {
      categoryId,
      type: 'standard' as ListingType,
      title: args.title,
      description: args.description,
      price: args.price,
      currency: (args.currency ?? 'ARS') as Currency,
      priceNegotiable: args.priceNegotiable ?? true,
      condition: (args.condition ?? 'used') as ListingCondition,
      city: args.city,
      province: args.province,
      paymentMethods: args.paymentMethods,
      shippingOptions: args.shippingOptions,
      saleType: (args.saleType ?? 'contact') as SaleType,
    } as CreateListingDto;

    const listing = await this.listingsService.create(userId, dto);

    const photoErrors: string[] = [];
    if (args.photosBase64 && args.photosBase64.length > 0) {
      for (const [i, p] of args.photosBase64.entries()) {
        try {
          const buffer = Buffer.from(p.data, 'base64');
          await this.listingImagesService.upload(userId, listing.id, buffer);
        } catch (err) {
          photoErrors.push(
            `Photo ${i + 1} failed: ${(err as Error).message ?? 'unknown error'}`,
          );
        }
      }
    }

    const [shop] = await this.db
      .select({ autoPublishViaAgent: sellerShops.autoPublishViaAgent })
      .from(sellerShops)
      .where(eq(sellerShops.userId, userId))
      .limit(1);

    const shouldPublish = shop?.autoPublishViaAgent === true;
    let finalStatus: string = listing.status;
    if (shouldPublish) {
      try {
        await this.listingsService.publish(userId, listing.id, {});
        finalStatus = 'active';
      } catch (err) {
        photoErrors.push(
          `Auto-publish failed: ${(err as Error).message ?? 'unknown error'}. Listing remains as draft.`,
        );
      }
    }

    return {
      listingId: listing.id,
      title: listing.title,
      status: finalStatus,
      publishedToPublicCatalog: finalStatus === 'active',
      reviewUrl: '/my-shop/listings',
      photosAttempted: args.photosBase64?.length ?? 0,
      photoErrors: photoErrors.length ? photoErrors : undefined,
      message: shouldPublish
        ? 'Listing was created and published to the public catalog.'
        : 'Listing was created as a DRAFT. Tell the seller to review and publish it at /my-shop/listings.',
    };
  }

  private async listMyListings(
    userId: string,
    status: string | undefined,
    limit: number,
  ) {
    type ListingStatus = NonNullable<
      (typeof schema.listings.$inferInsert)['status']
    >;
    const conditions = [eq(schema.listings.userId, userId)];
    if (status) {
      conditions.push(eq(schema.listings.status, status as ListingStatus));
    }
    const rows = await this.db
      .select({
        id: schema.listings.id,
        title: schema.listings.title,
        price: schema.listings.price,
        currency: schema.listings.currency,
        status: schema.listings.status,
        createdAt: schema.listings.createdAt,
        publishedAt: schema.listings.publishedAt,
      })
      .from(schema.listings)
      .where(and(...conditions))
      .orderBy(desc(schema.listings.createdAt))
      .limit(limit);
    return { listings: rows, count: rows.length };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async resolveCategoryId(categoryRef: string): Promise<string> {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(categoryRef)) return categoryRef;
    const [cat] = await this.db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.slug, categoryRef))
      .limit(1);
    if (!cat) {
      throw new Error(
        `Category not found by slug "${categoryRef}". Use list_categories to discover valid options.`,
      );
    }
    return cat.id;
  }

  /**
   * Wraps a tool handler so the MCP response is standard, errors are caught,
   * and every invocation is logged to agent_actions.
   */
  private async wrap<T>(
    token: VerifiedToken,
    tool: string,
    inputSummary: string | undefined,
    fn: () => Promise<T>,
  ): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: true;
  }> {
    try {
      const result = await fn();
      const affected =
        typeof result === 'object' &&
        result !== null &&
        'listingId' in result &&
        typeof (result as { listingId: unknown }).listingId === 'string'
          ? (result as { listingId: string }).listingId
          : undefined;
      void this.audit(token, tool, inputSummary, 'ok', affected).catch((e) =>
        this.logger.warn(`audit failed (${tool})`, e),
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = (err as Error).message ?? 'Unknown error';
      void this.audit(
        token,
        tool,
        inputSummary,
        'error',
        undefined,
        message,
      ).catch((e) => this.logger.warn(`audit failed (${tool})`, e));
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  }

  private async audit(
    token: VerifiedToken,
    tool: string,
    inputSummary: string | undefined,
    status: 'ok' | 'error',
    affectedListingId?: string,
    errorMessage?: string,
  ) {
    await this.db.insert(agentActions).values({
      tokenId: token.tokenId,
      userId: token.userId,
      tool,
      inputSummary: inputSummary ?? null,
      affectedListingId: affectedListingId ?? null,
      status,
      errorMessage: errorMessage ?? null,
    });
  }
}

function summarize(args: unknown): string {
  try {
    const json = JSON.stringify(args);
    // Strip base64 blobs to keep audit log readable.
    const stripped = json.replace(/"data":"[^"]{40,}"/g, '"data":"<base64>"');
    return stripped.slice(0, 500);
  } catch {
    return '<unserializable>';
  }
}
