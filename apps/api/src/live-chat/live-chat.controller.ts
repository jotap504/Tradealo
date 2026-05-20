import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LiveChatService } from './live-chat.service';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { SendLiveChatMessageDto } from './dto/send-live-chat-message.dto';
import { ListLiveChatMessagesDto } from './dto/list-live-chat-messages.dto';

@Controller('listings/:listingId/live-chat')
export class LiveChatController {
  constructor(private readonly liveChatService: LiveChatService) {}

  @Public()
  @Get('messages')
  @HttpCode(HttpStatus.OK)
  getMessages(
    @Param('listingId') listingId: string,
    @Query() query: ListLiveChatMessagesDto,
  ) {
    return this.liveChatService.getMessages(listingId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Post('messages')
  @RateLimit({ ttl: 60, limit: 10, keyBy: 'user' })
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('listingId') listingId: string,
    @Body() dto: SendLiveChatMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.liveChatService.sendMessage(listingId, user.sub, dto.content);
  }
}
