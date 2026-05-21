import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type Redis from 'ioredis';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { REDIS_TOKEN } from '../redis/redis.module';
import * as schema from '../database/schema';
import { ShopService } from '../shop/shop.service';

type DB = NodePgDatabase<typeof schema>;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CATALOG_TTL = 900;

const buildSystemPrompt = (shopName: string, catalog: string) =>
  `Sos el asistente de ventas de ${shopName}. Respondé en español. ` +
  `Usá el catálogo para responder preguntas sobre disponibilidad, precio y condición. ` +
  `Si no podés responder con certeza, respondé exactamente: SUGGEST_WHATSAPP\n\nCATÁLOGO:\n${catalog}`;

@Injectable()
export class ShopChatbotService {
  private readonly logger = new Logger(ShopChatbotService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly shopService: ShopService,
  ) {
    this.apiUrl =
      (process.env.AI_API_URL ?? 'https://api.deepseek.com/v1') +
      '/chat/completions';
    this.apiKey = process.env.AI_API_KEY ?? '';
    this.model = process.env.AI_MODEL ?? 'deepseek-chat';
  }

  async chat(shopId: string, userMessage: string, history: ChatMessage[] = []) {
    const shop = await this.shopService.getShopById(shopId);
    if (!shop || !shop.isPublished) {
      return { answer: 'Tienda no disponible.', suggestWhatsapp: false };
    }

    const catalog = await this.buildCatalog(shopId, shop.userId);
    const shopName = shop.shopName ?? 'esta tienda';

    const messages = [
      { role: 'system' as const, content: buildSystemPrompt(shopName, catalog) },
      ...history.slice(-8),
      { role: 'user' as const, content: userMessage },
    ];

    let rawAnswer = '';
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, messages, temperature: 0.5, max_tokens: 512 }),
      });

      if (!response.ok) {
        this.logger.warn(`AI API error ${response.status}`);
        return { answer: 'No pude procesar tu consulta. Intentá de nuevo.', suggestWhatsapp: false };
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      rawAnswer = json.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      this.logger.error('AI fetch error', err);
      return { answer: 'No pude procesar tu consulta.', suggestWhatsapp: true };
    }

    if (rawAnswer.includes('SUGGEST_WHATSAPP')) {
      const waNumber = (shop.whatsappBusiness ?? '').replace(/\D/g, '');
      return {
        answer: 'No tengo esa información con certeza. Te recomiendo contactar al vendedor directamente.',
        suggestWhatsapp: true,
        whatsappUrl: waNumber ? `https://wa.me/${waNumber}` : undefined,
      };
    }

    this.shopService.trackEvent({ shopId, eventType: 'chatbot_session' }).catch(() => null);

    return { answer: rawAnswer, suggestWhatsapp: false };
  }

  async invalidateCatalogCache(shopId: string) {
    await this.redis.del(`chatbot:catalog:${shopId}`).catch(() => null);
  }

  private async buildCatalog(shopId: string, userId: string): Promise<string> {
    const key = `chatbot:catalog:${shopId}`;

    try {
      const cached = await this.redis.get(key);
      if (cached) return cached;
    } catch { /* Redis unavailable */ }

    const listings = await this.db
      .select({
        title: schema.listings.title,
        price: schema.listings.price,
        currency: schema.listings.currency,
        condition: schema.listings.condition,
      })
      .from(schema.listings)
      .where(
        and(
          eq(schema.listings.userId, userId),
          eq(schema.listings.status, 'active'),
        ),
      )
      .limit(50);

    const catalog = listings.length
      ? listings.map((l, i) => `[${i + 1}] ${l.title} | ${l.currency} ${l.price} | ${l.condition}`).join('\n')
      : '(Sin productos activos)';

    try {
      await this.redis.set(key, catalog, 'EX', CATALOG_TTL);
    } catch { /* Redis unavailable */ }

    return catalog;
  }
}
