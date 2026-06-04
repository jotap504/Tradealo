import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import { StorageService } from '../storage/storage.service';

type DB = NodePgDatabase<typeof schema>;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class MlImageService {
  private readonly logger = new Logger(MlImageService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly storage: StorageService,
  ) {}

  async downloadAndStore(
    listingId: string,
    mlImageUrl: string,
    sortOrder: number,
    isPrimary: boolean,
  ): Promise<void> {
    const fullUrl = this.toFullVariant(mlImageUrl);
    const res = await fetch(fullUrl);
    if (!res.ok) {
      throw new Error(`ML image ${res.status} ${fullUrl}`);
    }

    const contentType = (res.headers.get('content-type') ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED.has(contentType)) {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      this.logger.warn(`Image ${fullUrl} exceeds ${MAX_BYTES}`);
      throw new Error(`Image exceeds ${MAX_BYTES} bytes (${buffer.length})`);
    }

    const ext = this.extFor(contentType);
    const key = `listings/${listingId}/${randomBytes(8).toString('hex')}.${ext}`;
    const publicUrl = await this.storage.uploadBuffer(key, buffer, contentType);

    await this.db.insert(schema.listingImages).values({
      listingId,
      url: publicUrl,
      r2Key: key,
      sortOrder,
      isPrimary,
    });
  }

  private toFullVariant(url: string): string {
    return url.replace(/-[A-Z]\.(jpg|jpeg|png|webp)/i, '-O.$1');
  }

  private extFor(contentType: string): string {
    if (contentType === 'image/jpeg') return 'jpg';
    if (contentType === 'image/png') return 'png';
    if (contentType === 'image/webp') return 'webp';
    return 'bin';
  }
}
