import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { sellerPaymentCredentials } from '../database/schema';
import {
  decryptSecret,
  encryptSecret,
  maskToken,
} from '../common/utils/crypto.util';

type DB = NodePgDatabase<typeof schema>;

interface MpUserResponse {
  id?: number | string;
  nickname?: string;
  site_id?: string;
  email?: string;
}

export interface CredentialSummary {
  hasCredential: boolean;
  provider?: string;
  mpUserId?: string | null;
  tokenKind?: string;
  lastValidatedAt?: Date | null;
  createdAt?: Date | null;
}

@Injectable()
export class SellerPaymentsService {
  private readonly logger = new Logger(SellerPaymentsService.name);

  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async upsertCredentials(userId: string, rawToken: string) {
    if (!rawToken || rawToken.length < 20) {
      throw new BadRequestException('Invalid access token');
    }
    if (!rawToken.startsWith('APP_USR-') && !rawToken.startsWith('TEST-')) {
      throw new BadRequestException(
        'The access token does not look like a MercadoPago token (expected APP_USR-* or TEST-*).',
      );
    }

    // Validate against MP /users/me before accepting
    let mpUser: MpUserResponse;
    try {
      const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${rawToken}` },
      });
      if (!res.ok) {
        throw new BadRequestException(
          `Token rejected by MercadoPago (HTTP ${res.status}). Verify you pasted your "Access Token de producción" from https://www.mercadopago.com.ar/developers/panel/app`,
        );
      }
      mpUser = (await res.json()) as MpUserResponse;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('MP token validation failed', err);
      throw new BadRequestException('Could not validate token with MercadoPago');
    }

    const encrypted = encryptSecret(rawToken);

    const [row] = await this.db
      .insert(sellerPaymentCredentials)
      .values({
        userId,
        provider: 'mercadopago',
        mpUserId: mpUser.id != null ? String(mpUser.id) : null,
        accessTokenCiphertext: encrypted.ciphertext,
        accessTokenIv: encrypted.iv,
        accessTokenAuthTag: encrypted.authTag,
        tokenKind: 'manual',
        lastValidatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sellerPaymentCredentials.userId,
        set: {
          mpUserId: mpUser.id != null ? String(mpUser.id) : null,
          accessTokenCiphertext: encrypted.ciphertext,
          accessTokenIv: encrypted.iv,
          accessTokenAuthTag: encrypted.authTag,
          tokenKind: 'manual',
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.toSummary(row);
  }

  async getSummary(userId: string): Promise<CredentialSummary> {
    const [row] = await this.db
      .select()
      .from(sellerPaymentCredentials)
      .where(eq(sellerPaymentCredentials.userId, userId))
      .limit(1);
    if (!row) return { hasCredential: false };
    return this.toSummary(row);
  }

  async deleteCredentials(userId: string) {
    const result = await this.db
      .delete(sellerPaymentCredentials)
      .where(eq(sellerPaymentCredentials.userId, userId))
      .returning();
    if (result.length === 0) throw new NotFoundException('No credentials found');
    return { ok: true };
  }

  /**
   * Returns the decrypted access token for `userId`. Used internally by
   * cart-api to build per-seller MP clients. Never expose to network.
   */
  async getDecryptedToken(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select()
      .from(sellerPaymentCredentials)
      .where(eq(sellerPaymentCredentials.userId, userId))
      .limit(1);
    if (!row) return null;
    return decryptSecret({
      ciphertext: row.accessTokenCiphertext,
      iv: row.accessTokenIv,
      authTag: row.accessTokenAuthTag,
    });
  }

  /** Returns a token preview safe for the UI (first/last chars only). */
  async getTokenPreview(userId: string): Promise<string | null> {
    const token = await this.getDecryptedToken(userId);
    return token ? maskToken(token) : null;
  }

  private toSummary(
    row: typeof sellerPaymentCredentials.$inferSelect,
  ): CredentialSummary {
    return {
      hasCredential: true,
      provider: row.provider,
      mpUserId: row.mpUserId,
      tokenKind: row.tokenKind,
      lastValidatedAt: row.lastValidatedAt,
      createdAt: row.createdAt,
    };
  }
}
