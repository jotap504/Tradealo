import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  RECENT = 'recent',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  REPUTATION = 'reputation',
}

export class ListListingsDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  saleType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  endingSoon?: number;

  @IsOptional()
  @IsString()
  paymentMethods?: string;

  /**
   * Dynamic category attribute filters as a JSON-encoded object.
   * Ex: attrs={"color":"rojo","talle":"38"}
   * Matches listings whose attributes jsonb contains these pairs OR
   * which have at least one active variant whose attribute_values contain them.
   */
  @IsOptional()
  @IsString()
  attrs?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasYoutubeLive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  excludeYoutubeLive?: boolean;

  @IsOptional()
  @IsEnum(SortOrder)
  sort?: SortOrder;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
