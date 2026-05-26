import { Injectable, Logger } from '@nestjs/common';

export interface DniValidationResult {
  valid: boolean;
  /** true when the AI couldn't or refused to process the image (safety block, parse error, network error) */
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

type ApiMode = 'openai' | 'gemini';

@Injectable()
export class VisionProvider {
  private readonly logger = new Logger(VisionProvider.name);
  private readonly mode: ApiMode;
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY ?? '';
    const aiUrl = process.env.AI_API_URL ?? '';
    const aiKey = process.env.AI_API_KEY ?? '';
    const aiModel = process.env.AI_MODEL ?? '';

    const effectiveKey = geminiKey || aiKey;
    // Google API keys always start with AIzaSy — detect even when stored in AI_API_KEY
    const isGoogleKey = effectiveKey.startsWith('AIzaSy');

    if (isGoogleKey && effectiveKey) {
      this.mode = 'gemini';
      this.apiKey = effectiveKey;
      this.apiUrl = 'https://generativelanguage.googleapis.com';
      this.model = this.normalizeGeminiModel(aiModel);
      this.logger.log(`VisionProvider: using Gemini (model=${this.model})`);
    } else if (aiUrl && aiKey) {
      this.mode = 'openai';
      this.apiKey = aiKey;
      this.apiUrl = aiUrl.replace(/\/+$/, '');
      this.model = aiModel || 'gpt-4o';
      this.logger.log(
        `VisionProvider: using OpenAI-compatible API at ${this.apiUrl} model=${this.model}`,
      );
    } else {
      this.mode = 'openai';
      this.apiKey = '';
      this.apiUrl = '';
      this.model = 'gpt-4o';
      this.logger.warn(
        'VisionProvider: no API key configured — vision validation disabled',
      );
    }
  }

  private normalizeGeminiModel(raw: string): string {
    if (!raw) return 'gemini-1.5-flash';
    const s = raw.toLowerCase().replace(/\s+/g, '-');
    // "gemini flash 2.0" | "gemini-flash-2.0" | "gemini-2.0-flash" → gemini-2.0-flash
    if (/gemini.*(2[._-]0).*flash|gemini.*flash.*(2[._-]0)/.test(s))
      return 'gemini-2.0-flash';
    if (/gemini.*(2[._-]0).*pro|gemini.*pro.*(2[._-]0)/.test(s))
      return 'gemini-2.0-pro';
    if (/gemini.*1[._-]5.*flash|gemini.*flash.*1[._-]5/.test(s))
      return 'gemini-1.5-flash';
    if (/gemini.*1[._-]5.*pro|gemini.*pro.*1[._-]5/.test(s))
      return 'gemini-1.5-pro';
    // Already a valid API id (no spaces) — use as-is
    if (!raw.includes(' ')) return raw;
    return s;
  }

  async validateDniPhoto(
    base64: string,
    mimeType = 'image/jpeg',
  ): Promise<DniValidationResult> {
    const raw = await this.callVision(base64, mimeType, DNI_PROMPT);

    // Network/API errors return this sentinel
    if (raw === '{"indeterminate":true}') {
      return { valid: false, indeterminate: true, confidence: 0, rawResponse: raw };
    }

    const parsed = this.parseJson(raw);

    // Could not parse response (safety block, unexpected format, free-tier refusal)
    if (!parsed) {
      this.logger.warn('validateDniPhoto: unparseable response, treating as indeterminate');
      return { valid: false, indeterminate: true, confidence: 0, rawResponse: raw };
    }

    if (!parsed.isValid) {
      // Gemini explicitly said this is not a DNI
      return { valid: false, confidence: Number(parsed.confidence) || 0.1, rawResponse: raw };
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
    if (!this.apiKey) return JSON.stringify({ isValid: false, confidence: 0 });

    return this.mode === 'gemini'
      ? this.callGemini(base64, mimeType, prompt)
      : this.callOpenAI(base64, mimeType, prompt);
  }

  private async callOpenAI(
    base64: string,
    mimeType: string,
    prompt: string,
  ): Promise<string> {
    const url = `${this.apiUrl}/chat/completions`;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const body = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
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
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      this.logger.error('OpenAI Vision network error', err);
      return JSON.stringify({ isValid: false, confidence: 0 });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`OpenAI Vision HTTP ${response.status}: ${text}`);
      return JSON.stringify({ isValid: false, confidence: 0 });
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content ?? '';

    if (!text) {
      this.logger.warn('OpenAI Vision returned empty content');
      return JSON.stringify({ isValid: false, confidence: 0 });
    }

    return text;
  }

  private async callGemini(
    base64: string,
    mimeType: string,
    prompt: string,
  ): Promise<string> {
    const url = `${this.apiUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      this.logger.error('Gemini Vision network error', err);
      return '{"indeterminate":true}';
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`Gemini Vision HTTP ${response.status}: ${text}`);
      return '{"indeterminate":true}';
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };

    if (json.promptFeedback?.blockReason) {
      this.logger.warn(`Gemini blocked request: ${json.promptFeedback.blockReason}`);
      return '{"indeterminate":true}';
    }

    const finishReason = json.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      this.logger.warn(`Gemini finishReason=${finishReason}, treating as indeterminate`);
      return '{"indeterminate":true}';
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      this.logger.warn('Gemini Vision returned empty text', JSON.stringify(json).slice(0, 300));
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
