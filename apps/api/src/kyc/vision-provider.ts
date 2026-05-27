import { Injectable, Logger } from '@nestjs/common';

export interface DniValidationResult {
  valid: boolean;
  indeterminate?: boolean;
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

const DNI_PROMPT = `Sos un validador de documentos argentinos. Analizá la imagen y determiná si muestra un DNI argentino (Documento Nacional de Identidad), ya sea el frente o el dorso.

El DNI argentino puede ser:
- Frente: tiene foto, nombre, número de DNI, fecha de nacimiento
- Dorso: tiene código de barras PDF417, número de DNI, domicilio

Respondé ÚNICAMENTE con JSON válido con esta estructura exacta:
{
  "fullName": "Nombre completo o null si no se ve",
  "dniNumber": "12345678 o null si no se ve",
  "expirationDate": "DD/MM/AAAA o null si no se ve",
  "isValid": true,
  "confidence": 0.95
}

Usá isValid: true si la imagen muestra claramente un documento que parece un DNI argentino, aunque no todos los datos sean legibles. Solo devolvé isValid: false si definitivamente NO es un DNI argentino (ej. es un selfie, una hoja en blanco, otro tipo de documento, o la imagen es completamente ilegible).`;

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
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.AI_API_KEY ?? '';
    this.apiUrl = (process.env.AI_API_URL ?? '').replace(/\/+$/, '');
    this.model =
      process.env.AI_VISION_MODEL ??
      'meta-llama/llama-3.2-11b-vision-instruct:free';

    if (this.apiKey && this.apiUrl) {
      this.logger.log(
        `VisionProvider: using ${this.apiUrl} model=${this.model}`,
      );
    } else {
      this.logger.warn(
        'VisionProvider: AI_API_KEY or AI_API_URL not configured — vision validation disabled',
      );
    }
  }

  async validateDniPhoto(
    base64: string,
    mimeType = 'image/jpeg',
  ): Promise<DniValidationResult> {
    const raw = await this.callVision(base64, mimeType, DNI_PROMPT);

    if (raw === '{"indeterminate":true}') {
      return { valid: false, indeterminate: true, confidence: 0, rawResponse: raw };
    }

    const parsed = this.parseJson(raw);
    if (!parsed) {
      this.logger.warn(
        'validateDniPhoto: unparseable response, treating as indeterminate',
      );
      return { valid: false, indeterminate: true, confidence: 0, rawResponse: raw };
    }

    if (!parsed.isValid) {
      return {
        valid: false,
        confidence: Number(parsed.confidence) || 0.1,
        rawResponse: raw,
      };
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
    const raw = await this.callVision(base64, mimeType, SELFIE_PROMPT);
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

  private async callVision(
    base64: string,
    mimeType: string,
    prompt: string,
  ): Promise<string> {
    if (!this.apiKey || !this.apiUrl) {
      return JSON.stringify({ isValid: false, confidence: 0 });
    }

    const url = `${this.apiUrl}/chat/completions`;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const body = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 512,
      temperature: 0.1,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      this.logger.error('Vision network/timeout error', err);
      return '{"indeterminate":true}';
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `Vision HTTP ${response.status}: ${text.slice(0, 300)}`,
      );
      return '{"indeterminate":true}';
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content ?? '';

    if (!text) {
      this.logger.warn(
        'Vision returned empty content',
        JSON.stringify(json).slice(0, 300),
      );
      return '{"indeterminate":true}';
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
        'Failed to parse Vision response as JSON',
        raw.slice(0, 300),
      );
      return null;
    }
  }
}
