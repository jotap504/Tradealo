import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ListingVariantsService } from './listing-variants.service';
import { BulkVariantsDto, VariantInputDto } from './dto/variant.dto';

@Controller('listings/:listingId/variants')
export class ListingVariantsController {
  constructor(private readonly service: ListingVariantsService) {}

  @Public()
  @Get('public')
  listPublic(@Param('listingId') listingId: string) {
    return this.service.listPublic(listingId);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Param('listingId') listingId: string) {
    return this.service.listForListing(listingId, user.sub);
  }

  @Post()
  createOne(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Body() dto: VariantInputDto,
  ) {
    return this.service.createOne(listingId, user.sub, dto);
  }

  @Put()
  replaceAll(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Body() dto: BulkVariantsDto,
  ) {
    return this.service.replaceAll(listingId, user.sub, dto.variants);
  }

  @Patch(':variantId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Param('variantId') variantId: string,
    @Body() dto: Partial<VariantInputDto>,
  ) {
    return this.service.update(listingId, variantId, user.sub, dto);
  }

  @Delete(':variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.service.remove(listingId, variantId, user.sub);
  }
}
