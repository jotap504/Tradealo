import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.sub, dto);
  }

  @Patch(':id/reply')
  @HttpCode(HttpStatus.OK)
  reply(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(id, user.sub, dto.replyText);
  }

  @Public()
  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findByUser(
      userId,
      cursor,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Public()
  @Get('user/:userId/reputation')
  getReputation(@Param('userId') userId: string) {
    return this.reviewsService.getReputation(userId);
  }
}
