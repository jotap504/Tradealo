import { Injectable, Logger } from '@nestjs/common'
import { StorageClient } from '@supabase/storage-js'

const PRESIGNED_PUT_TTL = 300
const PRESIGNED_GET_TTL = 3600

export interface PresignedPut {
  uploadUrl: string
  key: string
  expiresIn: number
}

export interface PresignedGet {
  url: string
  expiresIn: number
}

@Injectable()
export class StorageService {
  private readonly storage: StorageClient
  private readonly bucket: string
  private readonly logger = new Logger(StorageService.name)

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL ?? ''
    const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? ''
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'trocalia'

    this.storage = new StorageClient(`${supabaseUrl}/storage/v1`, {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    })
  }

  async getPresignedPut(key: string, _contentType: string): Promise<PresignedPut> {
    const { data, error } = await this.storage.from(this.bucket).createSignedUploadUrl(key)
    if (error) throw error
    return { uploadUrl: data.signedUrl, key, expiresIn: PRESIGNED_PUT_TTL }
  }

  async getPresignedGet(key: string): Promise<PresignedGet> {
    const { data, error } = await this.storage.from(this.bucket).createSignedUrl(key, PRESIGNED_GET_TTL)
    if (error) throw error
    return { url: data.signedUrl, expiresIn: PRESIGNED_GET_TTL }
  }

  async deleteObject(key: string): Promise<void> {
    const { error } = await this.storage.from(this.bucket).remove([key])
    if (error) this.logger.warn(`Failed to delete storage object: ${key}`, error)
  }

  getPublicUrl(key: string): string {
    const { data } = this.storage.from(this.bucket).getPublicUrl(key)
    return data.publicUrl
  }
}
