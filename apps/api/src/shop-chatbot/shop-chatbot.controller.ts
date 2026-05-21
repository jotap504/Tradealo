import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsArray, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ShopChatbotService } from './shop-chatbot.service';
import { Public } from '../common/decorators/public.decorator';

class ChatMessageDto {
  @IsIn(['user', 'assistant']) role!: 'user' | 'assistant';
  @IsString() @MaxLength(2000) content!: string;
}

class ChatRequestDto {
  @IsString() @MaxLength(1000) message!: string;
  @IsOptional() @IsArray() history?: ChatMessageDto[];
}

@Public()
@Controller('shop-chatbot')
export class ShopChatbotController {
  constructor(private readonly service: ShopChatbotService) {}

  @Post(':shopId/message')
  @HttpCode(HttpStatus.OK)
  chat(@Param('shopId') shopId: string, @Body() dto: ChatRequestDto) {
    return this.service.chat(shopId, dto.message, dto.history ?? []);
  }
}
