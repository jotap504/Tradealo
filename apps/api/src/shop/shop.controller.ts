import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
  IsIn,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShopService } from './shop.service';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class SocialLinksDto {
  @IsOptional() @IsUrl() instagram?: string;
  @IsOptional() @IsUrl() facebook?: string;
  @IsOptional() @IsUrl() tiktok?: string;
  @IsOptional() @IsUrl() youtube?: string;
  @IsOptional() @IsUrl() twitter?: string;
  @IsOptional() @IsUrl() website?: string;
}

class UpdateShopDto {
  @IsOptional() @IsString() @MaxLength(100) shopName?: string;
  @IsOptional() @IsString() @MaxLength(200) tagline?: string;
  @IsOptional() @IsString() about?: string;
  @IsOptional()
  @IsIn(['minimalista', 'oscuro', 'vibrante', 'clasico', 'boutique'])
  theme?: 'minimalista' | 'oscuro' | 'vibrante' | 'clasico' | 'boutique';
  @IsOptional() @IsString() @MaxLength(20) whatsappBusiness?: string;
  @IsOptional() @ValidateNested() @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
  @IsOptional() @IsString() @MaxLength(300) locationText?: string;
  @IsOptional() @IsString() @MaxLength(100) metaTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) metaDescription?: string;
}

class UploadImageDto {
  @IsString() data!: string;
  @IsString() mimetype!: string;
  @IsOptional() @IsString() @MaxLength(200) caption?: string;
}

class ReorderDto {
  @IsArray() @IsUUID('4', { each: true }) ids!: string[];
}

class PinListingDto {
  @IsUUID() listingId!: string;
}

class AnnouncementDto {
  @IsOptional() @IsString() @MaxLength(500) text?: string;
  @IsOptional() @IsString() expiresAt?: string;
}

class TrackEventDto {
  @IsString() eventType!: string;
  @IsOptional() @IsString() visitorHash?: string;
  @IsOptional() @IsUUID() listingId?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() referrer?: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Public()
  @Get('by-username/:username')
  getPublicShop(@Param('username') username: string) {
    return this.shopService.getPublicShop(username);
  }

  @Public()
  @Post(':shopId/analytics')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackEvent(
    @Param('shopId') shopId: string,
    @Body() dto: TrackEventDto,
  ) {
    await this.shopService.trackEvent({ shopId, ...dto });
  }

  @Get('me')
  getMyShop(@CurrentUser() user: JwtPayload) {
    return this.shopService.getMyShop(user.sub);
  }

  @Post('me')
  initShop(@CurrentUser() user: JwtPayload) {
    return this.shopService.initShop(user.sub);
  }

  @Patch('me')
  updateShop(@CurrentUser() user: JwtPayload, @Body() dto: UpdateShopDto) {
    return this.shopService.updateShopProfile(user.sub, dto);
  }

  @Post('me/logo')
  uploadLogo(@CurrentUser() user: JwtPayload, @Body() dto: UploadImageDto) {
    return this.shopService.uploadLogo(user.sub, dto.data, dto.mimetype);
  }

  @Post('me/banner')
  uploadBanner(@CurrentUser() user: JwtPayload, @Body() dto: UploadImageDto) {
    return this.shopService.uploadBanner(user.sub, dto.data, dto.mimetype);
  }

  @Post('me/gallery')
  addGalleryImage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadImageDto,
  ) {
    return this.shopService.addGalleryImage(
      user.sub,
      dto.data,
      dto.mimetype,
      dto.caption,
    );
  }

  @Delete('me/gallery/:imageId')
  @HttpCode(HttpStatus.OK)
  removeGalleryImage(
    @CurrentUser() user: JwtPayload,
    @Param('imageId') imageId: string,
  ) {
    return this.shopService.removeGalleryImage(user.sub, imageId);
  }

  @Patch('me/gallery/reorder')
  reorderGallery(@CurrentUser() user: JwtPayload, @Body() dto: ReorderDto) {
    return this.shopService.reorderGalleryImages(user.sub, dto.ids);
  }

  @Post('me/pinned-listings')
  pinListing(@CurrentUser() user: JwtPayload, @Body() dto: PinListingDto) {
    return this.shopService.pinListing(user.sub, dto.listingId);
  }

  @Delete('me/pinned-listings/:listingId')
  @HttpCode(HttpStatus.OK)
  unpinListing(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
  ) {
    return this.shopService.unpinListing(user.sub, listingId);
  }

  @Patch('me/pinned-listings/reorder')
  reorderPinnedListings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReorderDto,
  ) {
    return this.shopService.reorderPinnedListings(user.sub, dto.ids);
  }

  @Patch('me/announcement')
  setAnnouncement(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AnnouncementDto,
  ) {
    return this.shopService.setAnnouncement(user.sub, dto);
  }

  @Post('me/publish')
  @HttpCode(HttpStatus.OK)
  publishShop(@CurrentUser() user: JwtPayload) {
    return this.shopService.publishShop(user.sub);
  }

  @Get('me/analytics')
  getAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: string,
  ) {
    return this.shopService.getAnalytics(user.sub, days ? Number(days) : 30);
  }
}
