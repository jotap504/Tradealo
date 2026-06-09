import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantInputDto {
  @IsObject()
  attributeValues!: Record<string, string>;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  weightGrams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lengthCm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  widthCm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInputDto)
  variants!: VariantInputDto[];
}
