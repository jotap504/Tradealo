import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum ListingType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
export enum ListingCondition {
  NEW = 'new',
  USED = 'used',
  REFURBISHED = 'refurbished',
}
export enum Currency {
  ARS = 'ARS',
  USD = 'USD',
}
export enum SaleType {
  CONTACT = 'contact',
  STOCK = 'stock',
  AUCTION = 'auction',
}

export class CreateListingDto {
  @IsUUID()
  categoryId!: string;

  @IsEnum(ListingType)
  type!: ListingType;

  @IsString()
  @MinLength(5)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsEnum(Currency)
  currency!: Currency;

  @IsBoolean()
  priceNegotiable!: boolean;

  @IsEnum(ListingCondition)
  condition!: ListingCondition;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  province?: string;

  @IsOptional()
  @IsArray()
  paymentMethods?: string[];

  @IsOptional()
  @IsArray()
  shippingOptions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shippingDescription?: string;

  @IsOptional()
  collectibleAttributes?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsEnum(SaleType)
  saleType?: SaleType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  stock?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  desiredPrice?: number;

  @IsOptional()
  contactInfo?: Record<string, unknown>;
}
