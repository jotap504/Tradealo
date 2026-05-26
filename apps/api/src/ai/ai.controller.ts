import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { IsIn, IsObject } from 'class-validator'
import { AiService } from './ai.service'
import { GenerateListingDto } from './dto/generate-listing.dto'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

class GenerateTextDto {
  @IsIn(['description'])
  type!: 'description'

  @IsObject()
  context!: Record<string, unknown>
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-listing')
  @HttpCode(HttpStatus.OK)
  generate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateListingDto) {
    return this.aiService.generateListing(user.sub, dto)
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generateText(@CurrentUser() user: JwtPayload, @Body() dto: GenerateTextDto) {
    return this.aiService.generateText(user.sub, dto.type, dto.context)
  }

  @Get('quota')
  quota(@CurrentUser() user: JwtPayload) {
    return this.aiService.getRemainingQuota(user.sub)
  }
}
