import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CartApiService } from './cart-api.service';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

class CartItemDto {
  @IsString() listingId!: string;
  @IsInt() @IsPositive() quantity!: number;
}

class CreateCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsEmail() buyerEmail!: string;

  @IsOptional() @IsObject() shippingAddress?: Record<string, unknown>;
}

class CartWebhookDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsObject() data?: { id?: string | number };
}

@Public()
@Controller('agent-cart')
export class CartApiController {
  constructor(private readonly service: CartApiService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ ttl: 60, limit: 30 })
  async create(
    @Body() dto: CreateCartDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.createCart({
      items: dto.items,
      buyerEmail: dto.buyerEmail,
      shippingAddress: dto.shippingAddress,
      idempotencyKey: idempotencyKey ?? undefined,
    });
  }

  @Get(':id')
  @RateLimit({ ttl: 60, limit: 60 })
  async get(@Param('id') id: string) {
    return this.service.getCart(id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: CartWebhookDto, @Query('cart') cartId?: string) {
    await this.service.handleWebhook(body, cartId);
    return { ok: true };
  }
}
