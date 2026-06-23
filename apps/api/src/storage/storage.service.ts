import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { StorageClient } from '@supabase/storage-js';

const PRESIGNED_PUT_TTL = 300;
const PRESIGNED_GET_TTL = 3600;

export interface PresignedPut {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export interface PresignedGet {
  url: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly storage: StorageClient | null;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor() {
    const supabaseUrl = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '';
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'tradealo';

    if (!supabaseUrl) {
      this.logger.warn('SUPABASE_URL not set — storage disabled');
      this.storage = null;
      return;
    }

    this.storage = new StorageClient(`${supabaseUrl}/storage/v1`, {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    });
  }

  async getPresignedPut(
    key: string,
    _contentType: string,
  ): Promise<PresignedPut> {
    if (!this.storage) throw new Error('Storage not configured');
    const { data, error } = await this.storage
      .from(this.bucket)
      .createSignedUploadUrl(key);
    if (error) throw error;
    return { uploadUrl: data.signedUrl, key, expiresIn: PRESIGNED_PUT_TTL };
  }

  async getPresignedGet(key: string): Promise<PresignedGet> {
    if (!this.storage) throw new Error('Storage not configured');
    const { data, error } = await this.storage
      .from(this.bucket)
      .createSignedUrl(key, PRESIGNED_GET_TTL);
    if (error) throw error;
    return { url: data.signedUrl, expiresIn: PRESIGNED_GET_TTL };
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.storage)
      throw new InternalServerErrorException('Storage not configured');
    const { error } = await this.storage
      .from(this.bucket)
      .upload(key, buffer, { contentType, upsert: true });
    if (error) {
      this.logger.error(
        `Storage upload failed for key ${key}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Storage upload failed: ${error.message}`,
      );
    }
    return this.getPublicUrl(key);
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.storage) return;
    const { error } = await this.storage.from(this.bucket).remove([key]);
    if (error)
      this.logger.warn(`Failed to delete storage object: ${key}`, error);
  }

  getPublicUrl(key: string): string {
    if (!this.storage) return '';
    const { data } = this.storage.from(this.bucket).getPublicUrl(key);
    return data.publicUrl;
  }
}
