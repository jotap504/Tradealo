import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminTotpVerifyDto, AdminTotpConfirmDto } from './dto/admin-totp.dto';
import { Public } from '../common/decorators/public.decorator';
import { AdminPreAuthGuard } from '../common/guards/admin-preauth.guard';
import { CurrentAdminPreAuth } from '../common/decorators/current-admin.decorator';
import type { AdminPreAuthPayload } from './admin-auth.service';

@Controller('admin/auth')
@Public()
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.email, dto.password);
  }

  /**
   * Called once per admin account to generate the TOTP secret.
   * Returns otpauth:// URL — front-end renders QR from it.
   * Requires a valid pre-auth token (step after login, before TOTP is enabled).
   */
  @Get('totp/setup')
  @UseGuards(AdminPreAuthGuard)
  setupTotp(@CurrentAdminPreAuth() admin: AdminPreAuthPayload) {
    return this.adminAuthService.setupTotp(admin.sub);
  }

  /**
   * Confirms the TOTP secret is working before enabling it permanently.
   * Requires a valid pre-auth token.
   */
  @Post('totp/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminPreAuthGuard)
  confirmTotp(
    @CurrentAdminPreAuth() admin: AdminPreAuthPayload,
    @Body() dto: AdminTotpConfirmDto,
  ) {
    return this.adminAuthService.confirmTotp(admin.sub, dto.code);
  }

  /**
   * Validates the TOTP code and issues a full admin session token.
   * Requires a valid pre-auth token + correct TOTP code.
   */
  @Post('totp/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminPreAuthGuard)
  verifyTotp(
    @CurrentAdminPreAuth() admin: AdminPreAuthPayload,
    @Body() dto: AdminTotpVerifyDto,
  ) {
    return this.adminAuthService.verifyTotp(admin.sub, dto.code);
  }
}
