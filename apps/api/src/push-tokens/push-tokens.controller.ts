import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PushTokensService } from './push-tokens.service';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

class RegisterTokenDto {
  @IsString() @MinLength(10) @MaxLength(500) token!: string;
  @IsEnum(['android', 'ios', 'web']) platform!: 'android' | 'ios' | 'web';
  @IsOptional() @IsString() @MaxLength(100) deviceId?: string;
  @IsOptional() @IsString() @MaxLength(40) appVersion?: string;
}

@Controller('me/push-tokens')
export class PushTokensController {
  constructor(private readonly service: PushTokensService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  register(@CurrentUser() user: JwtPayload, @Body() dto: RegisterTokenDto) {
    return this.service.register(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.listForUser(user.sub);
  }

  @Delete(':token')
  @HttpCode(HttpStatus.OK)
  unregister(@CurrentUser() user: JwtPayload, @Param('token') token: string) {
    return this.service.unregister(user.sub, token);
  }
}
