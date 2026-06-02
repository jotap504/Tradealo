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
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsArray, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListListingsDto } from './dto/list-listings.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { BuyNowDto } from './dto/buy-now.dto';
import { AskQuestionDto } from './dto/ask-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

class BulkStatusDto {
  @IsArray() @IsUUID('4', { each: true }) listingIds!: string[];
  @IsEnum(['paused', 'active']) target!: 'paused' | 'active';
}

class BulkPriceDto {
  @IsArray() @IsUUID('4', { each: true }) listingIds!: string[];
  @IsEnum(['percent', 'absolute']) mode!: 'percent' | 'absolute';
  @IsNumber() value!: number;
}

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

  @Get('me')
  findMe(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('saleType') saleType?: string,
    @Query('offset') offset?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.listingsService.findByUser(
      user.sub,
      cursor,
      limit ? parseInt(limit, 10) : 20,
      status,
      search,
      saleType,
      offset !== undefined ? parseInt(offset, 10) : undefined,
      categoryId,
    );
  }

  @Get('mine')
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('saleType') saleType?: string,
    @Query('offset') offset?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.listingsService.findByUser(
      user.sub,
      cursor,
      limit ? parseInt(limit, 10) : 20,
      status,
      search,
      saleType,
      offset !== undefined ? parseInt(offset, 10) : undefined,
      categoryId,
    );
  }

  // ─── Bulk operations ────────────────────────────────────────────────────

  @Patch('bulk-status')
  @RateLimit({ ttl: 60, limit: 20, keyBy: 'user' })
  bulkStatus(@CurrentUser() user: JwtPayload, @Body() dto: BulkStatusDto) {
    return this.listingsService.bulkUpdateStatus(
      user.sub,
      dto.listingIds,
      dto.target,
    );
  }

  @Patch('bulk-price')
  @RateLimit({ ttl: 60, limit: 20, keyBy: 'user' })
  bulkPrice(@CurrentUser() user: JwtPayload, @Body() dto: BulkPriceDto) {
    return this.listingsService.bulkAdjustPrice(
      user.sub,
      dto.listingIds,
      dto.mode,
      dto.value,
    );
  }

  @Get('export.csv')
  @RateLimit({ ttl: 60, limit: 6, keyBy: 'user' })
  async exportCsv(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const csv = await this.listingsService.exportCsvForUser(user.sub);
    const filename = `trocalia-listings-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    res
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csv);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: { type?: string; durationDays?: number },
  ) {
    return this.listingsService.publish(id, user.sub, dto);
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

  @Post(':id/contact')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ ttl: 3600, limit: 10, keyBy: 'user' })
  contactSeller(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('message') message: string,
  ) {
    return this.listingsService.contactSeller(id, user.sub, message);
  }

  @Post(':id/buy')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ ttl: 3600, limit: 5, keyBy: 'user' })
  buyNow(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() _dto: BuyNowDto,
  ) {
    return this.listingsService.buyNow(id, user.sub);
  }

  @Post(':id/bids')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ ttl: 60, limit: 10, keyBy: 'user' })
  placeBid(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: PlaceBidDto,
  ) {
    return this.listingsService.placeBid(id, user.sub, dto);
  }

  @Get(':id/bids')
  getBids(@Param('id') id: string) {
    return this.listingsService.getBids(id);
  }

  @Post(':id/questions')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ ttl: 3600, limit: 10, keyBy: 'user' })
  askQuestion(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AskQuestionDto,
  ) {
    return this.listingsService.askQuestion(id, user.sub, dto.question);
  }

  @Post(':id/questions/:questionId/answer')
  @HttpCode(HttpStatus.OK)
  answerQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.listingsService.answerQuestion(
      id,
      questionId,
      user.sub,
      dto.answer,
    );
  }

  @Public()
  @Get(':id/questions')
  getQuestions(@Param('id') id: string) {
    return this.listingsService.getQuestions(id);
  }

  @Post(':id/questions/publish')
  @HttpCode(HttpStatus.CREATED)
  publishChatAsQuestion(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: { buyerUserId: string; question: string; answer: string },
  ) {
    return this.listingsService.publishChatAsQuestion(
      id,
      user.sub,
      dto.buyerUserId,
      dto.question,
      dto.answer,
    );
  }
}
