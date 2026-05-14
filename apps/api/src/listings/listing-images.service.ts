import sharp from 'sharp';
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, count } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { StorageService } from '../storage/storage.service';
import * as schema from '../database/schema';
import { LISTING } from '../common/constants/listing.constants';
import type {
  ConfirmImageDto,
  ReorderImagesDto,
} from './dto/confirm-image.dto';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class ListingImagesService {
  private readonly logger = new Logger(ListingImagesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly storage: StorageService,
  ) {}

  async upload(userId: string, listingId: string, buffer: Buffer) {
    const listing = await this.assertOwner(userId, listingId);
    await this.assertBelowMaxImages(listingId, listing.type);

    const timestamp = Date.now();
    const mainKey = `listings/${listingId}/${timestamp}.jpg`;
    const thumbKey = `listings/${listingId}/${timestamp}_thumb.jpg`;

    let mainBuffer: Buffer;
    let thumbBuffer: Buffer;
    try {
      mainBuffer = await sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      thumbBuffer = await sharp(buffer)
        .resize({ width: 400, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
    } catch (err) {
      this.logger.error(`Sharp processing failed: ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException('INVALID_IMAGE_FORMAT');
    }

    try {
      const [imageUrl, thumbnailUrl] = await Promise.all([
        this.storage.uploadBuffer(mainKey, mainBuffer, 'image/jpeg'),
        this.storage.uploadBuffer(thumbKey, thumbBuffer, 'image/jpeg'),
      ]);

      const isPrimary = (await this.countImages(listingId)) === 0;

      const [image] = await this.db
        .insert(schema.listingImages)
        .values({
          listingId,
          url: imageUrl,
          thumbnailUrl,
          r2Key: mainKey,
          sortOrder: 0,
          isPrimary,
        })
        .returning();

      return image;
    } catch (err) {
      await this.storage.deleteObject(mainKey).catch(() => {});
      await this.storage.deleteObject(thumbKey).catch(() => {});
      throw err;
    }
  }

  async getUploadUrl(userId: string, listingId: string) {
    const listing = await this.assertOwner(userId, listingId);
    await this.assertBelowMaxImages(listingId, listing.type);

    const key = `listings/${listingId}/${Date.now()}.jpg`;
    return this.storage.getPresignedPut(key, 'image/jpeg');
  }

  async confirmUpload(userId: string, listingId: string, dto: ConfirmImageDto) {
    const listing = await this.assertOwner(userId, listingId);
    await this.assertBelowMaxImages(listingId, listing.type);

    if (!dto.key.startsWith(`listings/${listingId}/`)) {
      throw new BadRequestException('INVALID_IMAGE_KEY');
    }

    const imageUrl = this.storage.getPublicUrl(dto.key);
    const isPrimary = (await this.countImages(listingId)) === 0;

    const [image] = await this.db
      .insert(schema.listingImages)
      .values({
        listingId,
        url: imageUrl,
        r2Key: dto.key,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary,
      })
      .returning();

    return image;
  }

  async reorder(userId: string, listingId: string, dto: ReorderImagesDto) {
    await this.assertOwner(userId, listingId);

    await Promise.all(
      dto.imageIds.map((imageId, index) =>
        this.db
          .update(schema.listingImages)
          .set({ sortOrder: index, isPrimary: index === 0 })
          .where(
            and(
              eq(schema.listingImages.id, imageId),
              eq(schema.listingImages.listingId, listingId),
            ),
          ),
      ),
    );

    return this.db
      .select()
      .from(schema.listingImages)
      .where(eq(schema.listingImages.listingId, listingId));
  }

  async remove(userId: string, listingId: string, imageId: string) {
    await this.assertOwner(userId, listingId);

    const [image] = await this.db
      .select()
      .from(schema.listingImages)
      .where(
        and(
          eq(schema.listingImages.id, imageId),
          eq(schema.listingImages.listingId, listingId),
        ),
      )
      .limit(1);

    if (!image) throw new NotFoundException('IMAGE_NOT_FOUND');

    await this.storage.deleteObject(image.r2Key);
    await this.db
      .delete(schema.listingImages)
      .where(eq(schema.listingImages.id, imageId));
  }

  private async assertOwner(userId: string, listingId: string) {
    const [listing] = await this.db
      .select({
        id: schema.listings.id,
        userId: schema.listings.userId,
        type: schema.listings.type,
      })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);

    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId !== userId)
      throw new ForbiddenException('LISTING_NOT_OWNED');
    return listing;
  }

  private async assertBelowMaxImages(listingId: string, type: string) {
    const current = await this.countImages(listingId);
    const max =
      type === 'premium'
        ? LISTING.MAX_IMAGES_PREMIUM
        : LISTING.MAX_IMAGES_STANDARD;
    if (current >= max)
      throw new BadRequestException(`MAX_IMAGES_REACHED (max: ${max})`);
  }

  private async countImages(listingId: string): Promise<number> {
    const [result] = await this.db
      .select({ total: count() })
      .from(schema.listingImages)
      .where(eq(schema.listingImages.listingId, listingId));
    return result?.total ?? 0;
  }
}
