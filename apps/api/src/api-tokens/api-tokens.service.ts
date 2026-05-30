import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { apiTokens } from '../database/schema';

type DB = NodePgDatabase<typeof schema>;

const TOKEN_PREFIX = 'trc_';
const TOKEN_RAW_BYTES = 24;

export interface VerifiedToken {
  tokenId: string;
  userId: string;
  scopes: string[];
}

@Injectable()
export class ApiTokensService {
  private readonly logger = new Logger(ApiTokensService.name);

  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async create(userId: string, name: string, scopes: string[] = []) {
    if (!name?.trim() || name.length > 80) {
      throw new BadRequestException('Token name required (max 80 chars)');
    }

    const raw = TOKEN_PREFIX + randomBytes(TOKEN_RAW_BYTES).toString('base64url');
    const prefix = raw.slice(0, 12);
    const hash = await bcrypt.hash(raw, 10);

    const [row] = await this.db
      .insert(apiTokens)
      .values({
        userId,
        name: name.trim(),
        tokenHash: hash,
        tokenPrefix: prefix,
        scopes,
      })
      .returning();

    return {
      id: row.id,
      name: row.name,
      prefix: row.tokenPrefix,
      scopes: row.scopes,
      createdAt: row.createdAt,
      // Only returned once — caller must show to user immediately.
      token: raw,
    };
  }

  async listForUser(userId: string) {
    const rows = await this.db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        prefix: apiTokens.tokenPrefix,
        scopes: apiTokens.scopes,
        lastUsedAt: apiTokens.lastUsedAt,
        createdAt: apiTokens.createdAt,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
      .orderBy(desc(apiTokens.createdAt));
    return rows;
  }

  async revoke(userId: string, tokenId: string) {
    const [row] = await this.db
      .select()
      .from(apiTokens)
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Token not found');
    await this.db
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(eq(apiTokens.id, tokenId));
    return { ok: true };
  }

  /**
   * Validates a bearer token. Returns the owning user and scopes if valid,
   * null otherwise. Updates lastUsedAt best-effort (does not block).
   */
  async verify(rawToken: string, ip?: string): Promise<VerifiedToken | null> {
    if (!rawToken?.startsWith(TOKEN_PREFIX)) return null;
    const prefix = rawToken.slice(0, 12);

    // Look up by prefix to avoid bcrypt-comparing every row.
    const rows = await this.db
      .select()
      .from(apiTokens)
      .where(
        and(eq(apiTokens.tokenPrefix, prefix), isNull(apiTokens.revokedAt)),
      );

    for (const row of rows) {
      if (row.expiresAt && row.expiresAt.getTime() < Date.now()) continue;
      const ok = await bcrypt.compare(rawToken, row.tokenHash);
      if (!ok) continue;

      // Fire and forget — don't block the caller on the touch.
      void this.touch(row.id, ip).catch((err) =>
        this.logger.warn(`Failed to touch token ${row.id}`, err),
      );

      return {
        tokenId: row.id,
        userId: row.userId,
        scopes: row.scopes ?? [],
      };
    }
    return null;
  }

  private async touch(tokenId: string, ip?: string) {
    await this.db
      .update(apiTokens)
      .set({ lastUsedAt: new Date(), lastUsedIp: ip ?? null })
      .where(eq(apiTokens.id, tokenId));
  }
}
