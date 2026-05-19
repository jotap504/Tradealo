import { Injectable, Logger } from '@nestjs/common';

export interface DniValidationResult {
  valid: boolean;
  extractedData?: {
    fullName: string;
    dniNumber: string;
    expirationDate: string;
  };
  confidence: number;
  rawResponse: unknown;
}

export interface SelfieValidationResult {
  valid: boolean;
  confidence: number;
  rawResponse: unknown;
}

const DNI_PROMPT = `Sos un validador de documentos argentinos. Analizá la imagen del DNI (Documento Nacional de Identidad) argentino y extraé:

1. El nombre completo del titular
2. El número de DNI
3. La fecha de vencimiento

Respondé ÚNICAMENTE con JSON válido con esta estructura exacta:
{
  "fullName": "Nombre completo",
  "dniNumber": "12345678",
  "expirationDate": "DD/MM/AAAA",
  "isValid": true,
  "confidence": 0.95
}

Si no se ve claramente un DNI argentino o no se pueden extraer los datos, devolvé isValid: false y confidence bajo.`;

const SELFIE_PROMPT = `Sos un validador de identidad. Analizá la selfie y verificá:

1. Se ve claramente el rostro de una persona
2. La persona está sosteniendo un DNI argentino (Documento Nacional de Identidad)
3. El DNI está visible y legible

Respondé ÚNICAMENTE con JSON válido con esta estructura exacta:
{
  "faceVisible": true,
  "dniVisible": true,
  "isValid": true,
  "confidence": 0.95
}

Si no se ve claramente una persona sosteniendo un DNI, devolvé isValid: false.`;

@Injectable()
export class VisionProvider {
  private readonly logger = new Logger(VisionProvider.name);
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

  async validateDniPhoto(base64: string): Promise<DniValidationResult> {
    const raw = await this.callVision(base64, DNI_PROMPT);
    const parsed = this.parseJsonResponse(raw);

    if (!parsed || !parsed.isValid) {
      return { valid: false, confidence: 0, rawResponse: raw };
    }

    return {
      valid: true,
      extractedData: {
        fullName: String(parsed.fullName ?? ''),
        dniNumber: String(parsed.dniNumber ?? ''),
        expirationDate: String(parsed.expirationDate ?? ''),
      },
      confidence: Number(parsed.confidence) ?? 0,
      rawResponse: raw,
    };
  }

  async validateSelfie(base64: string): Promise<SelfieValidationResult> {
    const raw = await this.callVision(base64, SELFIE_PROMPT);
    const parsed = this.parseJsonResponse(raw);

    if (!parsed || !parsed.isValid) {
      return { valid: false, confidence: 0, rawResponse: raw };
    }

    return {
      valid: true,
      confidence: Number(parsed.confidence) ?? 0,
      rawResponse: raw,
    };
  }

  private async callVision(
    base64: string,
    prompt: string,
  ): Promise<Record<string, unknown> | string> {
    const body = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 512,
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      this.logger.error(
        `DeepSeek Vision error: ${response.status} ${response.statusText}`,
      );
      return { isValid: false, confidence: 0 };
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      this.logger.warn('DeepSeek Vision returned empty response');
      return { isValid: false, confidence: 0 };
    }

    return content;
  }

  private parseJsonResponse(
    raw: Record<string, unknown> | string,
  ): Record<string, unknown> | null {
    if (typeof raw !== 'string') return raw as Record<string, unknown>;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          return JSON.parse(match[1]) as Record<string, unknown>;
        } catch {
          /* fall through */
        }
      }
      this.logger.warn('Failed to parse DeepSeek Vision response as JSON');
      return null;
    }
  }
}
