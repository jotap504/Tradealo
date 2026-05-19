import { Injectable } from '@nestjs/common';

export interface BcraResult {
  status: 'passed' | 'flagged' | 'error';
  score: string;
  summary: string;
  rawData: Record<string, unknown>;
}

@Injectable()
export class BcraProvider {
  async consult(
    _cuitDni: string,
    _consentToken: string,
    _userData?: { firstName?: string; lastName?: string },
  ): Promise<BcraResult> {
    // Mock: 90% pass, 10% flagged
    const isFlagged = Math.random() < 0.1;

    if (isFlagged) {
      return {
        status: 'flagged',
        score: 'medium_risk',
        summary: 'Se detectaron inconsistencias en el historial crediticio.',
        rawData: { mock: true, riskFlags: ['late_payments'] },
      };
    }

    return {
      status: 'passed',
      score: 'low_risk',
      summary: 'Sin antecedentes negativos en el BCRA.',
      rawData: { mock: true, riskFlags: [] },
    };
  }
}
