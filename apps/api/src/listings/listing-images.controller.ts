import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ListingImagesService } from './listing-images.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { UploadImageDto } from './dto/upload-image.dto';
import { ConfirmImageDto, ReorderImagesDto } from './dto/confirm-image.dto';

@Controller('listings/:listingId/images')
export class ListingImagesController {
  constructor(private readonly imagesService: ListingImagesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Body() dto: UploadImageDto,
  ) {
    const buffer = Buffer.from(dto.data, 'base64');
    if (buffer.byteLength > 5 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 5 MB');
    }
    return this.imagesService.upload(user.sub, listingId, buffer);
  }

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  getUploadUrl(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
  ) {
    return this.imagesService.getUploadUrl(user.sub, listingId);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirmUpload(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Body() dto: ConfirmImageDto,
  ) {
    return this.imagesService.confirmUpload(user.sub, listingId, dto);
  }

  @Patch('reorder')
  reorder(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Body() dto: ReorderImagesDto,
  ) {
    return this.imagesService.reorder(user.sub, listingId, dto);
  }

  @Patch(':imageId/variant')
  assignVariant(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Param('imageId') imageId: string,
    @Body() body: { variantId: string | null },
  ) {
    return this.imagesService.assignVariant(
      user.sub,
      listingId,
      imageId,
      body.variantId ?? null,
    );
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.imagesService.remove(user.sub, listingId, imageId);
  }
}
