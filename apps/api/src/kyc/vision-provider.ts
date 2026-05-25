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

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

@Injectable()
export class VisionProvider {
  private readonly logger = new Logger(VisionProvider.name);
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY / AI_API_KEY not set — KYC vision validation disabled',
      );
    }
  }

  async validateDniPhoto(
    base64: string,
    mimeType = 'image/jpeg',
  ): Promise<DniValidationResult> {
    const raw = await this.callGemini(base64, mimeType, DNI_PROMPT);
    const parsed = this.parseJson(raw);

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
      confidence: Number(parsed.confidence) || 0,
      rawResponse: raw,
    };
  }

  async validateSelfie(
    base64: string,
    mimeType = 'image/jpeg',
  ): Promise<SelfieValidationResult> {
    const raw = await this.callGemini(base64, mimeType, SELFIE_PROMPT);
    const parsed = this.parseJson(raw);

    if (!parsed || !parsed.isValid) {
      return { valid: false, confidence: 0, rawResponse: raw };
    }

    return {
      valid: true,
      confidence: Number(parsed.confidence) || 0,
      rawResponse: raw,
    };
  }

  private async callGemini(
    base64: string,
    mimeType: string,
    prompt: string,
  ): Promise<string> {
    if (!this.apiKey) return JSON.stringify({ isValid: false, confidence: 0 });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error('Gemini Vision network error', err);
      return JSON.stringify({ isValid: false, confidence: 0 });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`Gemini Vision error: ${response.status} ${text}`);
      return JSON.stringify({ isValid: false, confidence: 0 });
    }

    const json = (await response.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      this.logger.warn('Gemini Vision returned empty response');
      return JSON.stringify({ isValid: false, confidence: 0 });
    }

    return text;
  }

  private parseJson(raw: string): Record<string, unknown> | null {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          return JSON.parse(match[1]) as Record<string, unknown>;
        } catch {
          /* fall through */
        }
      }
      this.logger.warn(
        'Failed to parse Gemini Vision response as JSON',
        raw.slice(0, 200),
      );
      return null;
    }
  }
}
