import { Injectable, Logger } from '@nestjs/common';
import type { MlItem } from './mercadolibre-api.client';

export interface CandidateCategory {
  id: string;
  name: string;
}

export interface DraftedListingCopy {
  title: string;
  description: string;
  condition: 'nuevo' | 'usado' | 'reacondicionado';
  suggestedCategoryId: string | null;
  priceArs: number;
  currency: 'ARS' | 'USD';
  paymentMethods: string[];
}

const SYSTEM_PROMPT = `Sos un asistente que reescribe publicaciones para Trocalia (marketplace argentino). \
Devolvé SOLO un objeto JSON válido, sin texto extra ni fences.\n\n\
Claves obligatorias:\n\
- title: string, 5-150 chars, español rioplatense, sin emojis ni mayúsculas excesivas.\n\
- description: string, 20-5000 chars, español rioplatense, prosa clara, sin spam.\n\
- condition: "nuevo" | "usado" | "reacondicionado".\n\
- suggestedCategoryId: uuid del shortlist provisto, o null si ninguna encaja.\n\
- priceArs: número (precio en ARS).\n\
- currency: "ARS" o "USD".\n\
- paymentMethods: subset de ["mercadopago","transferencia","efectivo"].\n`;

@Injectable()
export class MlAiDrafterService {
  private readonly logger = new Logger(MlAiDrafterService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiUrl =
      (process.env.AI_API_URL ?? 'https://api.deepseek.com/v1') +
      '/chat/completions';
    this.apiKey = process.env.AI_API_KEY ?? '';
    this.model = process.env.AI_MODEL ?? 'deepseek-chat';
  }

  async draftListingCopy(
    item: MlItem,
    originalDescription: string,
    candidates: CandidateCategory[],
  ): Promise<DraftedListingCopy> {
    const userPayload = {
      mlItem: {
        title: item.title,
        original_description: originalDescription.slice(0, 4000),
        price: item.price,
        currency_id: item.currency_id,
        condition: item.condition,
        attributes: (item.attributes ?? []).slice(0, 20).map((a) => ({
          name: a.name,
          value: a.value_name,
        })),
      },
      candidateCategories: candidates,
    };

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: JSON.stringify(userPayload) },
    ];

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`AI ${res.status}: ${text.slice(0, 200)}`);
      throw new Error(`AI ${res.status}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? '';
    const parsed = this.parseJson(raw);
    return this.normalize(parsed, item, candidates);
  }

  private parseJson(raw: string): Record<string, unknown> {
    const tryParse = (s: string): Record<string, unknown> | null => {
      try {
        return JSON.parse(s) as Record<string, unknown>;
      } catch {
        return null;
      }
    };
    const first = tryParse(raw);
    if (first) return first;

    const fenced = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const second = tryParse(fenced);
    if (second) return second;

    throw new Error('AI did not return parseable JSON');
  }

  private normalize(
    raw: Record<string, unknown>,
    item: MlItem,
    candidates: CandidateCategory[],
  ): DraftedListingCopy {
    const title = String(raw.title ?? item.title).slice(0, 150);
    const description = String(raw.description ?? '').slice(0, 5000);
    const condition = this.mapCondition(raw.condition, item.condition);
    const candidateIds = new Set(candidates.map((c) => c.id));
    const suggested =
      typeof raw.suggestedCategoryId === 'string' &&
      candidateIds.has(raw.suggestedCategoryId)
        ? raw.suggestedCategoryId
        : null;
    const priceArs = Number(raw.priceArs ?? item.price) || 0;
    const currency: 'ARS' | 'USD' = raw.currency === 'USD' ? 'USD' : 'ARS';
    const allowedPm = new Set(['mercadopago', 'transferencia', 'efectivo']);
    const paymentMethods = Array.isArray(raw.paymentMethods)
      ? (raw.paymentMethods as unknown[])
          .map((p) => String(p).toLowerCase())
          .filter((p) => allowedPm.has(p))
      : ['mercadopago'];

    if (title.length < 5 || description.length < 20) {
      throw new Error('AI output failed minimum-length validation');
    }

    return {
      title,
      description,
      condition,
      suggestedCategoryId: suggested,
      priceArs,
      currency,
      paymentMethods,
    };
  }

  private mapCondition(
    raw: unknown,
    fallback: string,
  ): 'nuevo' | 'usado' | 'reacondicionado' {
    const norm = String(raw ?? fallback).toLowerCase();
    if (norm === 'new' || norm === 'nuevo') return 'nuevo';
    if (norm === 'refurbished' || norm === 'reacondicionado')
      return 'reacondicionado';
    return 'usado';
  }
}
