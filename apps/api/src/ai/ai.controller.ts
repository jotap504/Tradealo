import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { AiService } from './ai.service'
import { GenerateListingDto } from './dto/generate-listing.dto'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-listing')
  @HttpCode(HttpStatus.OK)
  generate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateListingDto) {
    return this.aiService.generateListing(user.sub, dto)
  }

  @Get('quota')
  quota(@CurrentUser() user: JwtPayload) {
    return this.aiService.getRemainingQuota(user.sub)
  }
}
