import { Injectable, Logger } from '@nestjs/common';

export type TrocaliaField =
  | 'title'
  | 'description'
  | 'price'
  | 'currency'
  | 'condition'
  | 'categoryHint'
  | 'imagesUrls'
  | 'sku'
  | 'stock'
  | 'ignore';

export interface ColumnMapping {
  index: number;
  header: string;
  field: TrocaliaField;
  confidence: number;
  reason?: string;
}

const SYSTEM_PROMPT = `Sos un asistente que mapea columnas de un Excel a campos de Trocalia (marketplace argentino).\n\
Recibís headers + 3 filas sample. Devolvé SOLO JSON con la forma:\n\
{ "columns": [ { "index": <number>, "header": <string>, "field": <TrocaliaField>, "confidence": <0..1>, "reason": <string opcional> } ] }\n\n\
Campos posibles ("field"):\n\
- title: nombre del producto.\n\
- description: descripcion larga.\n\
- price: precio en numero.\n\
- currency: ARS o USD.\n\
- condition: nuevo/usado/reacondicionado.\n\
- categoryHint: texto libre que da pista de categoria (ej. "Celulares").\n\
- imagesUrls: una o varias URLs de imagen separadas por coma o pipe.\n\
- sku: identificador unico del producto.\n\
- stock: cantidad en inventario.\n\
- ignore: si la columna no encaja con nada.\n\n\
Cada index aparece UNA vez. Si dudas, usa ignore con confidence baja.`;

@Injectable()
export class ExcelAiMapperService {
  private readonly logger = new Logger(ExcelAiMapperService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiUrl =
      (process.env.AI_API_URL ?? 'https://api.deepseek.com/v1') +
      '/chat/completions';
    this.apiKey = process.env.AI_API_KEY ?? '';
    this.model =
      process.env.AI_TEXT_MODEL ?? process.env.AI_MODEL ?? 'openai/gpt-4o-mini';
  }

  async detectMapping(
    headers: string[],
    sampleRows: (string | number | null)[][],
  ): Promise<ColumnMapping[]> {
    const payload = {
      headers,
      sampleRows: sampleRows.slice(0, 3),
    };
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: JSON.stringify(payload) },
    ];

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer':
          process.env.APP_URL ?? 'https://tradealo-web.vercel.app',
        'X-Title': 'Trocalia Excel Import',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`AI ${res.status}: ${text.slice(0, 200)}`);
      return this.heuristicMapping(headers);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? '';
    try {
      const parsed = JSON.parse(raw) as {
        columns?: ColumnMapping[];
      };
      if (Array.isArray(parsed.columns) && parsed.columns.length > 0) {
        return parsed.columns.map((c) => ({
          index: Number(c.index),
          header: String(c.header ?? headers[Number(c.index)] ?? ''),
          field: this.validField(c.field),
          confidence: Number(c.confidence) || 0,
          reason: c.reason,
        }));
      }
    } catch {
      /* fall through */
    }
    return this.heuristicMapping(headers);
  }

  private validField(raw: unknown): TrocaliaField {
    const allowed: TrocaliaField[] = [
      'title',
      'description',
      'price',
      'currency',
      'condition',
      'categoryHint',
      'imagesUrls',
      'sku',
      'stock',
      'ignore',
    ];
    const v = String(raw ?? 'ignore') as TrocaliaField;
    return allowed.includes(v) ? v : 'ignore';
  }

  private heuristicMapping(headers: string[]): ColumnMapping[] {
    return headers.map((h, i) => ({
      index: i,
      header: h,
      field: this.guessFromHeader(h),
      confidence: 0.3,
    }));
  }

  private guessFromHeader(h: string): TrocaliaField {
    const norm = h.toLowerCase().trim();
    if (/(titulo|titulo|title|nombre|name|producto)/.test(norm)) return 'title';
    if (/(descripci|description|detalle)/.test(norm)) return 'description';
    if (/(precio|price|importe|valor)/.test(norm)) return 'price';
    if (/(moneda|currency)/.test(norm)) return 'currency';
    if (/(condicion|condition|estado)/.test(norm)) return 'condition';
    if (/(categoria|category|rubro)/.test(norm)) return 'categoryHint';
    if (/(imagen|image|foto|picture|url)/.test(norm)) return 'imagesUrls';
    if (/(sku|codigo|id)/.test(norm)) return 'sku';
    if (/(stock|cantidad|qty)/.test(norm)) return 'stock';
    return 'ignore';
  }
}
