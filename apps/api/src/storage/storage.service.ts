import { Injectable, Logger } from '@nestjs/common'
import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const PRESIGNED_PUT_TTL = 300   // 5 min for uploads
const PRESIGNED_GET_TTL = 3600  // 1 hour for admin review

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
  private readonly client: S3Client
  private readonly bucket: string
  private readonly publicUrl: string
  private readonly logger = new Logger(StorageService.name)

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME ?? 'tradealo'
    this.publicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')

    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT ?? '',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    })
  }

  async getPresignedPut(key: string, contentType: string): Promise<PresignedPut> {
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: PRESIGNED_PUT_TTL },
    )
    return { uploadUrl, key, expiresIn: PRESIGNED_PUT_TTL }
  }

  async getPresignedGet(key: string): Promise<PresignedGet> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: PRESIGNED_GET_TTL },
    )
    return { url, expiresIn: PRESIGNED_GET_TTL }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
    } catch (err) {
      this.logger.warn(`Failed to delete R2 object: ${key}`, err)
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }
}
