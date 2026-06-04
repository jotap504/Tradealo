import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { encryptSecret, decryptSecret } from '../common/utils/crypto.util';
import { MercadolibreApiClient } from './mercadolibre-api.client';

type DB = NodePgDatabase<typeof schema>;

const PROVIDER = 'mercadolibre';
const STATE_TTL_MS = 10 * 60 * 1000;
const REFRESH_LEAD_MS = 60 * 1000;

@Injectable()
export class MercadolibreOauthService {
  private readonly logger = new Logger(MercadolibreOauthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly stateSecret: string;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly api: MercadolibreApiClient,
  ) {
    this.clientId = process.env.ML_CLIENT_ID ?? '';
    this.clientSecret = process.env.ML_CLIENT_SECRET ?? '';
    this.redirectUri = process.env.ML_REDIRECT_URI ?? '';
    this.stateSecret = process.env.ML_OAUTH_STATE_SECRET ?? '';
  }

  isConfigured(): boolean {
    return !!(
      this.clientId &&
      this.clientSecret &&
      this.redirectUri &&
      this.stateSecret
    );
  }

  getAuthorizeUrl(userId: string): string {
    if (!this.isConfigured()) {
      throw new Error('MercadoLibre OAuth is not configured');
    }
    const state = this.signState(userId);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
    });
    return `https://auth.mercadolibre.com.ar/authorization?${params.toString()}`;
  }

  async completeOAuth(
    code: string,
    state: string,
  ): Promise<{ userId: string; siteId: string; nickname: string }> {
    const userId = this.verifyState(state);
    if (!userId) throw new BadRequestException('INVALID_STATE');

    const token = await this.api.exchangeCode(
      code,
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );
    const me = await this.api.getMe(token.access_token);

    const access = encryptSecret(token.access_token);
    const refresh = token.refresh_token
      ? encryptSecret(token.refresh_token)
      : null;
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    await this.db
      .insert(schema.sellerMarketplaceConnections)
      .values({
        userId,
        provider: PROVIDER,
        externalUserId: String(token.user_id),
        externalNickname: me.nickname,
        siteId: me.site_id,
        accessTokenCiphertext: access.ciphertext,
        accessTokenIv: access.iv,
        accessTokenAuthTag: access.authTag,
        refreshTokenCiphertext: refresh?.ciphertext,
        refreshTokenIv: refresh?.iv,
        refreshTokenAuthTag: refresh?.authTag,
        scope: token.scope ?? null,
        expiresAt,
        lastValidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          schema.sellerMarketplaceConnections.userId,
          schema.sellerMarketplaceConnections.provider,
        ],
        set: {
          externalUserId: String(token.user_id),
          externalNickname: me.nickname,
          siteId: me.site_id,
          accessTokenCiphertext: access.ciphertext,
          accessTokenIv: access.iv,
          accessTokenAuthTag: access.authTag,
          refreshTokenCiphertext: refresh?.ciphertext,
          refreshTokenIv: refresh?.iv,
          refreshTokenAuthTag: refresh?.authTag,
          scope: token.scope ?? null,
          expiresAt,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    return { userId, siteId: me.site_id, nickname: me.nickname };
  }

  async getConnection(userId: string) {
    const [row] = await this.db
      .select()
      .from(schema.sellerMarketplaceConnections)
      .where(
        and(
          eq(schema.sellerMarketplaceConnections.userId, userId),
          eq(schema.sellerMarketplaceConnections.provider, PROVIDER),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async disconnect(userId: string): Promise<void> {
    await this.db
      .delete(schema.sellerMarketplaceConnections)
      .where(
        and(
          eq(schema.sellerMarketplaceConnections.userId, userId),
          eq(schema.sellerMarketplaceConnections.provider, PROVIDER),
        ),
      );
  }

  async getAccessToken(userId: string): Promise<string> {
    const row = await this.getConnection(userId);
    if (!row) throw new ForbiddenException('MERCADOLIBRE_NOT_CONNECTED');

    const expiresAtMs = row.expiresAt ? row.expiresAt.getTime() : 0;
    if (expiresAtMs - Date.now() > REFRESH_LEAD_MS) {
      return decryptSecret({
        ciphertext: row.accessTokenCiphertext,
        iv: row.accessTokenIv,
        authTag: row.accessTokenAuthTag,
      });
    }

    if (
      !row.refreshTokenCiphertext ||
      !row.refreshTokenIv ||
      !row.refreshTokenAuthTag
    ) {
      throw new ForbiddenException('MERCADOLIBRE_REFRESH_UNAVAILABLE');
    }
    const refreshToken = decryptSecret({
      ciphertext: row.refreshTokenCiphertext,
      iv: row.refreshTokenIv,
      authTag: row.refreshTokenAuthTag,
    });

    this.logger.debug(`Refreshing ML access token for user ${userId}`);
    const token = await this.api.refresh(
      refreshToken,
      this.clientId,
      this.clientSecret,
    );
    const access = encryptSecret(token.access_token);
    const newRefresh = token.refresh_token
      ? encryptSecret(token.refresh_token)
      : null;
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    await this.db
      .update(schema.sellerMarketplaceConnections)
      .set({
        accessTokenCiphertext: access.ciphertext,
        accessTokenIv: access.iv,
        accessTokenAuthTag: access.authTag,
        refreshTokenCiphertext: newRefresh?.ciphertext ?? null,
        refreshTokenIv: newRefresh?.iv ?? null,
        refreshTokenAuthTag: newRefresh?.authTag ?? null,
        scope: token.scope ?? row.scope ?? null,
        expiresAt,
        lastValidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.sellerMarketplaceConnections.id, row.id));

    return token.access_token;
  }

  private signState(userId: string): string {
    const ts = Date.now().toString();
    const nonce = randomBytes(8).toString('hex');
    const payload = `${userId}.${ts}.${nonce}`;
    const sig = createHmac('sha256', this.stateSecret)
      .update(payload)
      .digest('hex');
    return Buffer.from(`${payload}.${sig}`).toString('base64url');
  }

  private verifyState(state: string): string | null {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf8');
      const parts = decoded.split('.');
      if (parts.length !== 4) return null;
      const [userId, ts, nonce, sig] = parts;
      const expected = createHmac('sha256', this.stateSecret)
        .update(`${userId}.${ts}.${nonce}`)
        .digest('hex');
      if (expected !== sig) return null;
      if (Date.now() - Number(ts) > STATE_TTL_MS) return null;
      return userId;
    } catch {
      return null;
    }
  }
}
