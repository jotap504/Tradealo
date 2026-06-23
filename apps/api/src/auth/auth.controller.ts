import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import type { GoogleProfile } from './strategies/google.strategy';
import type { Request } from 'express';
import { PhoneVerifyDto } from './dto/phone.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ ttl: 3600, limit: 3, keyBy: 'ip' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ ttl: 900, limit: 5, keyBy: 'ip' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtPayload, @Body() dto: RefreshDto) {
    await this.authService.logout(user.sub, dto.refreshToken);
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayload, @Req() _req: Request) {
    return this.authService.getMe(user.sub);
  }

  @Public()
  @Post('phone/login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ ttl: 60, limit: 10, keyBy: 'ip' })
  async phoneLogin(@Body() dto: PhoneVerifyDto) {
    return this.authService.loginWithPhone(dto.idToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('phone/link')
  @HttpCode(HttpStatus.OK)
  async phoneLink(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PhoneVerifyDto,
  ) {
    return this.authService.linkPhone(user.sub, dto.idToken);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google — nothing to do here
  }

  @Public()
  @Post('google/id-token')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ ttl: 60, limit: 10, keyBy: 'ip' })
  async googleIdToken(@Body() body: { idToken?: string }) {
    if (!body.idToken || typeof body.idToken !== 'string') {
      throw new BadRequestException('idToken is required');
    }
    return this.authService.loginWithGoogleIdToken(body.idToken);
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: GoogleProfile },
    @Res() res: Response,
  ) {
    const result = await this.authService.findOrCreateGoogleUser(req.user);
    const frontendUrl = (
      process.env.FRONTEND_URL ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    const userEncoded = Buffer.from(JSON.stringify(result.user)).toString(
      'base64url',
    );
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&user=${userEncoded}`,
    );
  }
}
