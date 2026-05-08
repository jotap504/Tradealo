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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListListingsDto } from './dto/list-listings.dto';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ ttl: 3600, limit: 20, keyBy: 'user' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateListingDto) {
    return this.listingsService.create(user.sub, dto);
  }

  @Public()
  @Get()
  findAll(@Query() query: ListListingsDto) {
    return this.listingsService.findAll(query);
  }

  @Get('mine')
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listingsService.findByUser(
      user.sub,
      cursor,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Public()
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.listingsService.findOne(id, req.user?.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: Partial<CreateListingDto>,
  ) {
    return this.listingsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.listingsService.remove(id, user.sub);
  }
}
