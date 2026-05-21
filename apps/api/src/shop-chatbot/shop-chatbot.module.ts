import { Module } from '@nestjs/common';
import { ShopChatbotService } from './shop-chatbot.service';
import { ShopChatbotController } from './shop-chatbot.controller';
import { ShopModule } from '../shop/shop.module';

@Module({
  imports: [ShopModule],
  controllers: [ShopChatbotController],
  providers: [ShopChatbotService],
})
export class ShopChatbotModule {}
