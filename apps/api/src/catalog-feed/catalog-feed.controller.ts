import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogFeedService } from './catalog-feed.service';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

@Public()
@Controller('feed')
export class CatalogFeedController {
  constructor(private readonly service: CatalogFeedService) {}

  @Get('products.json')
  @RateLimit({ ttl: 60, limit: 60 })
  @Header('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600')
  async productsJson(@Query('cursor') cursor?: string) {
    const { items, nextCursor } = await this.service.getActiveListings(cursor);
    return this.service.productsToJsonLd(items, nextCursor);
  }

  @Get('products.xml')
  @RateLimit({ ttl: 60, limit: 30 })
  async productsXml(@Res() res: Response, @Query('cursor') cursor?: string) {
    const { items } = await this.service.getActiveListings(cursor);
    const xml = this.service.productsToGoogleMerchantXml(items);
    res
      .header('Content-Type', 'application/xml; charset=utf-8')
      .header(
        'Cache-Control',
        'public, max-age=600, stale-while-revalidate=3600',
      )
      .send(xml);
  }

  @Get('shops.json')
  @RateLimit({ ttl: 60, limit: 60 })
  @Header('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600')
  async shopsJson() {
    const shops = await this.service.getActiveShops();
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Trocalia — Tiendas activas',
      numberOfItems: shops.length,
      itemListElement: shops.map((s, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: s.url,
        item: {
          '@type': 'Store',
          name: s.shopName ?? s.username,
          description: s.tagline ?? undefined,
          image: s.logoUrl ?? undefined,
          url: s.url,
        },
      })),
    };
  }
}
