import { IsOptional, IsUUID } from 'class-validator';

export class BuyNowDto {
  @IsOptional()
  @IsUUID()
  variantId?: string;
}
