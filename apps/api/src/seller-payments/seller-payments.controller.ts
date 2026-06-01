import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { SellerPaymentsService } from './seller-payments.service';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

class UpsertCredentialsDto {
  @IsString() @MinLength(20) @MaxLength(200) accessToken!: string;
}

@Controller('me/payment-credentials')
export class SellerPaymentsController {
  constructor(private readonly service: SellerPaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upsert(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertCredentialsDto,
  ) {
    return this.service.upsertCredentials(user.sub, dto.accessToken.trim());
  }

  @Get()
  async get(@CurrentUser() user: JwtPayload) {
    const summary = await this.service.getSummary(user.sub);
    const preview = summary.hasCredential
      ? await this.service.getTokenPreview(user.sub)
      : null;
    return { ...summary, tokenPreview: preview };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: JwtPayload) {
    return this.service.deleteCredentials(user.sub);
  }
}
