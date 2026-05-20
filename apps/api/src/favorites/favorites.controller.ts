import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.favoritesService.list(user.sub);
  }

  @Get('ids')
  listIds(@CurrentUser() user: JwtPayload) {
    return this.favoritesService.listIds(user.sub);
  }

  @Post(':listingId')
  @HttpCode(HttpStatus.OK)
  add(@CurrentUser() user: JwtPayload, @Param('listingId') listingId: string) {
    return this.favoritesService.add(user.sub, listingId);
  }

  @Delete(':listingId')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('listingId') listingId: string,
  ) {
    return this.favoritesService.remove(user.sub, listingId);
  }
}
