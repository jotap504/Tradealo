import { Injectable, Logger } from '@nestjs/common';

export interface BcraResult {
  status: 'passed' | 'flagged' | 'error';
  score: string;
  summary: string;
  rawData: Record<string, unknown>;
}

interface BcraEntidad {
  entidad: string;
  situacion: number;
  monto?: number;
  diasAtrasoPago?: number;
  procesoJud?: boolean;
  situacionJuridica?: boolean;
}

interface BcraDeudaResponse {
  status: number;
  results?: {
    identificacion: number;
    denominacion?: string;
    periodos?: Array<{
      periodo: string;
      entidades: BcraEntidad[];
    }>;
  };
}

@Injectable()
export class BcraProvider {
  private readonly logger = new Logger(BcraProvider.name);
  private readonly BASE_URL = 'https://api.bcra.gob.ar';

  async consult(dniOrCuit: string): Promise<BcraResult> {
    const cuits = this.deriveCuits(dniOrCuit);

    if (!cuits.length) {
      this.logger.warn(`BcraProvider: cannot derive CUIT from "${dniOrCuit}"`);
      return {
        status: 'passed',
        score: 'unknown',
        summary: 'No se pudo derivar CUIT del DNI ingresado.',
        rawData: { input: dniOrCuit },
      };
    }

    for (const cuit of cuits) {
      try {
        const data = await this.fetchDeudas(cuit);
        if (data !== null) {
          this.logger.log(`BCRA hit for CUIT ${cuit}`);
          return this.assess(data, cuit);
        }
      } catch (err) {
        this.logger.error(`BCRA fetch error for CUIT ${cuit}`, err);
      }
    }

    // 404 from all CUITs → no records = clean
    return {
      status: 'passed',
      score: 'low_risk',
      summary: 'Sin antecedentes registrados en el BCRA.',
      rawData: { tried: cuits },
    };
  }

  private async fetchDeudas(cuit: string): Promise<BcraDeudaResponse | null> {
    const url = `${this.BASE_URL}/centraldedeudores/v1.0/Deudas/${cuit}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`BCRA HTTP ${res.status} ${res.statusText}`);

    return res.json() as Promise<BcraDeudaResponse>;
  }

  private assess(data: BcraDeudaResponse, cuit: string): BcraResult {
    const periodos = data.results?.periodos ?? [];

    if (!periodos.length) {
      return {
        status: 'passed',
        score: 'low_risk',
        summary: 'Sin deudas reportadas en el BCRA.',
        rawData: { cuit },
      };
    }

    let maxSituacion = 1;
    let hasJudicial = false;
    let totalDebtARS = 0;

    for (const periodo of periodos) {
      for (const entidad of periodo.entidades) {
        if (entidad.situacion > maxSituacion) maxSituacion = entidad.situacion;
        if (entidad.procesoJud || entidad.situacionJuridica) hasJudicial = true;
        totalDebtARS += (entidad.monto ?? 0) * 1000;
      }
    }

    const rawData = { cuit, maxSituacion, hasJudicial, totalDebtARS };

    if (hasJudicial || maxSituacion >= 5) {
      return {
        status: 'flagged',
        score: 'critical_risk',
        summary: hasJudicial
          ? 'Proceso judicial activo detectado en el BCRA.'
          : 'Deuda irrecuperable (situación 5/6) reportada en el BCRA.',
        rawData,
      };
    }

    if (maxSituacion >= 3) {
      return {
        status: 'flagged',
        score: 'high_risk',
        summary: `Situación crediticia ${maxSituacion} en el BCRA — se requiere revisión manual.`,
        rawData,
      };
    }

    return {
      status: 'passed',
      score: maxSituacion === 1 ? 'low_risk' : 'medium_risk',
      summary: 'Situación crediticia normal en el BCRA.',
      rawData,
    };
  }

  // Returns candidate CUITs for a given DNI (7-8 digits) or passes CUIT through (11 digits)
  private deriveCuits(input: string): string[] {
    const clean = input.replace(/\D/g, '');

    if (clean.length === 11) return [clean];

    if (clean.length < 7 || clean.length > 8) return [];

    const padded = clean.padStart(8, '0');
    const results: string[] = [];

    // Try male (20) then female (27) then both-surnames (23)
    for (const prefix of ['20', '27', '23']) {
      const cuit = this.buildCuit(prefix, padded);
      if (cuit) results.push(cuit);
    }

    return results;
  }

  // AFIP checksum for CUIT
  private buildCuit(prefix: string, dni8: string): string | null {
    const digits = (prefix + dni8).split('').map(Number);
    if (digits.length !== 10) return null;

    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    const rem = sum % 11;

    let verif: number;
    if (rem === 0) verif = 0;
    else if (rem === 1) verif = 9;
    else verif = 11 - rem;

    return `${prefix}${dni8}${verif}`;
  }
}
