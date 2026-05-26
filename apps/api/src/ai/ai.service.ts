import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_TOKEN } from '../redis/redis.module';
import { ConfigService } from '../config/config.service';
import type { GenerateListingDto } from './dto/generate-listing.dto';

export interface GeneratedListing {
  title: string;
  description: string;
  suggestedTags: string[];
}

const SYSTEM_PROMPT = `Eres un experto en marketplaces de Argentina. Dado lo que el usuario quiere vender, genera:
1. Un título conciso (máx 80 caracteres) sin emojis ni mayúsculas innecesarias
2. Una descripción atractiva (150-300 caracteres) que resalte las características clave
3. Hasta 5 etiquetas relevantes en español

Responde ÚNICAMENTE con JSON válido con las claves: title, description, suggestedTags (array de strings).`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl =
      (process.env.AI_API_URL ?? 'https://api.deepseek.com/v1') +
      '/chat/completions';
    this.apiKey = process.env.AI_API_KEY ?? '';
    this.model = process.env.AI_MODEL ?? 'deepseek-chat';
  }

  async generateListing(
    userId: string,
    dto: GenerateListingDto,
  ): Promise<GeneratedListing> {
    await this.checkRateLimit(userId);

    const raw = await this.callApi(dto.prompt);
    await this.incrementUsage(userId);

    return raw;
  }

  async getRemainingQuota(
    userId: string,
  ): Promise<{ used: number; limit: number; remaining: number }> {
    const limit = await this.configService.getNumber('ai.daily_limit', 3);
    const key = this.rateKey(userId);
    const used = parseInt((await this.redis.get(key)) ?? '0', 10);
    return { used, limit, remaining: Math.max(0, limit - used) };
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const limit = await this.configService.getNumber('ai.daily_limit', 3);
    const key = this.rateKey(userId);
    const current = parseInt((await this.redis.get(key)) ?? '0', 10);

    if (current >= limit) {
      throw new HttpException(
        { message: 'AI_DAILY_LIMIT_EXCEEDED', limit },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async incrementUsage(userId: string): Promise<void> {
    const key = this.rateKey(userId);
    const ttl = this.secondsUntilMidnight();
    await this.redis.multi().incr(key).expire(key, ttl).exec();
  }

  private async callApi(prompt: string): Promise<GeneratedListing> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      this.logger.error(
        `AI API error: ${response.status} ${response.statusText}`,
      );
      throw new HttpException('AI_SERVICE_UNAVAILABLE', HttpStatus.BAD_GATEWAY);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content)
      throw new HttpException('AI_EMPTY_RESPONSE', HttpStatus.BAD_GATEWAY);

    try {
      const parsed = JSON.parse(content) as GeneratedListing;
      return {
        title: String(parsed.title ?? '').slice(0, 80),
        description: String(parsed.description ?? '').slice(0, 500),
        suggestedTags: Array.isArray(parsed.suggestedTags)
          ? parsed.suggestedTags.slice(0, 5).map(String)
          : [],
      };
    } catch {
      throw new HttpException('AI_INVALID_RESPONSE', HttpStatus.BAD_GATEWAY);
    }
  }

  async generateText(
    userId: string,
    _type: 'description',
    context: Record<string, unknown>,
  ): Promise<{ text: string }> {
    await this.checkRateLimit(userId);

    const title = String(context.title ?? '').trim();
    if (!title)
      throw new HttpException('TITLE_REQUIRED', HttpStatus.BAD_REQUEST);

    const prompt = this.buildDescriptionPrompt(
      title,
      String(context.category ?? ''),
    );
    const text = await this.callPlainTextApi(prompt);

    await this.incrementUsage(userId);
    return { text };
  }

  private buildDescriptionPrompt(title: string, category: string): string {
    return `Escribí una descripción corta y atractiva para esta publicación de marketplace en Argentina.
Título: "${title}"${category ? `\nCategoría: ${category}` : ''}

Respondé SOLO con la descripción (entre 150 y 400 caracteres), en español argentino, sin emojis, sin repetir el título, sin etiquetas ni marcas adicionales.`;
  }

  private async callPlainTextApi(prompt: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY ?? '';
    if (geminiKey) {
      return this.callGeminiText(geminiKey, prompt);
    }
    return this.callOpenAIText(prompt);
  }

  private async callGeminiText(
    apiKey: string,
    prompt: string,
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      this.logger.error('Gemini text API error', err);
      throw new HttpException('AI_SERVICE_UNAVAILABLE', HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(
        `Gemini text HTTP ${res.status}: ${body.slice(0, 200)}`,
      );
      throw new HttpException('AI_SERVICE_UNAVAILABLE', HttpStatus.BAD_GATEWAY);
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text)
      throw new HttpException('AI_EMPTY_RESPONSE', HttpStatus.BAD_GATEWAY);
    return text.trim();
  }

  private async callOpenAIText(prompt: string): Promise<string> {
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 256,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      this.logger.error(`OpenAI text HTTP ${res.status}`);
      throw new HttpException('AI_SERVICE_UNAVAILABLE', HttpStatus.BAD_GATEWAY);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content ?? '';
    if (!text)
      throw new HttpException('AI_EMPTY_RESPONSE', HttpStatus.BAD_GATEWAY);
    return text.trim();
  }

  private rateKey(userId: string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `ai:gen:${userId}:${today}`;
  }

  private secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
  }
}
