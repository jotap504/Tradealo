import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';
import type { VariantInputDto } from './dto/variant.dto';

type DB = NodePgDatabase<typeof schema>;
type Variant = typeof schema.listingVariants.$inferSelect;

@Injectable()
export class ListingVariantsService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async listForListing(listingId: string, userId: string): Promise<Variant[]> {
    await this.assertOwnership(listingId, userId);
    return this.db
      .select()
      .from(schema.listingVariants)
      .where(eq(schema.listingVariants.listingId, listingId));
  }

  async listPublic(listingId: string): Promise<Variant[]> {
    return this.db
      .select()
      .from(schema.listingVariants)
      .where(
        and(
          eq(schema.listingVariants.listingId, listingId),
          eq(schema.listingVariants.isActive, true),
        ),
      );
  }

  async createOne(
    listingId: string,
    userId: string,
    dto: VariantInputDto,
  ): Promise<Variant> {
    await this.assertOwnership(listingId, userId);
    const [row] = await this.db
      .insert(schema.listingVariants)
      .values({
        listingId,
        attributeValues: dto.attributeValues,
        stock: dto.stock,
        sku: dto.sku,
        price: dto.price != null ? String(dto.price) : null,
        weightGrams: dto.weightGrams,
        lengthCm: dto.lengthCm,
        widthCm: dto.widthCm,
        heightCm: dto.heightCm,
        isActive: dto.isActive ?? true,
      })
      .returning();
    return row;
  }

  async replaceAll(
    listingId: string,
    userId: string,
    variants: VariantInputDto[],
  ): Promise<Variant[]> {
    await this.assertOwnership(listingId, userId);
    await this.db
      .delete(schema.listingVariants)
      .where(eq(schema.listingVariants.listingId, listingId));
    if (variants.length === 0) return [];
    return this.db
      .insert(schema.listingVariants)
      .values(
        variants.map((v) => ({
          listingId,
          attributeValues: v.attributeValues,
          stock: v.stock,
          sku: v.sku,
          price: v.price != null ? String(v.price) : null,
          weightGrams: v.weightGrams,
          lengthCm: v.lengthCm,
          widthCm: v.widthCm,
          heightCm: v.heightCm,
          isActive: v.isActive ?? true,
        })),
      )
      .returning();
  }

  async update(
    listingId: string,
    variantId: string,
    userId: string,
    dto: Partial<VariantInputDto>,
  ): Promise<Variant> {
    await this.assertOwnership(listingId, userId);
    const [row] = await this.db
      .update(schema.listingVariants)
      .set({
        ...(dto.attributeValues !== undefined && {
          attributeValues: dto.attributeValues,
        }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.price !== undefined && {
          price: dto.price != null ? String(dto.price) : null,
        }),
        ...(dto.weightGrams !== undefined && { weightGrams: dto.weightGrams }),
        ...(dto.lengthCm !== undefined && { lengthCm: dto.lengthCm }),
        ...(dto.widthCm !== undefined && { widthCm: dto.widthCm }),
        ...(dto.heightCm !== undefined && { heightCm: dto.heightCm }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.listingVariants.id, variantId),
          eq(schema.listingVariants.listingId, listingId),
        ),
      )
      .returning();
    if (!row) throw new NotFoundException('VARIANT_NOT_FOUND');
    return row;
  }

  async remove(
    listingId: string,
    variantId: string,
    userId: string,
  ): Promise<void> {
    await this.assertOwnership(listingId, userId);
    await this.db
      .delete(schema.listingVariants)
      .where(
        and(
          eq(schema.listingVariants.id, variantId),
          eq(schema.listingVariants.listingId, listingId),
        ),
      );
  }

  private async assertOwnership(
    listingId: string,
    userId: string,
  ): Promise<void> {
    const [listing] = await this.db
      .select({ userId: schema.listings.userId })
      .from(schema.listings)
      .where(eq(schema.listings.id, listingId))
      .limit(1);
    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.userId !== userId) throw new ForbiddenException('NOT_OWNER');
  }
}
