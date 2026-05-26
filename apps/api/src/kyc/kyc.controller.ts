import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import { RejectKycDto } from './dto/review-kyc.dto';
import { UploadKycDocumentDto } from './dto/upload-kyc-document.dto';
import { SilverPhoneCameraDto } from './dto/silver-phone-camera.dto';
import { BcraConsentDto } from './dto/bcra-consent.dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  getStatus(@CurrentUser() user: JwtPayload) {
    return this.kycService.getStatus(user.sub);
  }

  @Get('tiers')
  getTierProgress(@CurrentUser() user: JwtPayload) {
    return this.kycService.getTierProgress(user.sub);
  }

  @Post('id')
  @HttpCode(HttpStatus.OK)
  uploadId(@CurrentUser() user: JwtPayload, @Body() dto: UploadKycDocumentDto) {
    return this.kycService.uploadDocument(
      user.sub,
      'dni',
      dto.data,
      dto.mimetype,
    );
  }

  @Post('selfie')
  @HttpCode(HttpStatus.OK)
  uploadSelfie(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadKycDocumentDto,
  ) {
    return this.kycService.uploadDocument(
      user.sub,
      'selfie',
      dto.data,
      dto.mimetype,
    );
  }

  @Post('address')
  @HttpCode(HttpStatus.OK)
  uploadAddress(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadKycDocumentDto,
  ) {
    return this.kycService.uploadDocument(
      user.sub,
      'address',
      dto.data,
      dto.mimetype,
    );
  }

  @Post('silver/phone-camera')
  @HttpCode(HttpStatus.OK)
  uploadPhoneCamera(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SilverPhoneCameraDto,
  ) {
    return this.kycService.uploadPhoneCamera(
      user.sub,
      dto.frontData,
      dto.frontMimetype,
      dto.backData,
      dto.backMimetype,
    );
  }

  @Post('silver/bcra-consent')
  @HttpCode(HttpStatus.OK)
  recordBcraConsent(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BcraConsentDto,
  ) {
    return this.kycService.recordBcraConsent(user.sub, dto.consent);
  }

  @Get('bcra-result')
  getBcraResult(@CurrentUser() user: JwtPayload) {
    return this.kycService.getBcraResult(user.sub);
  }

  @Get('debug')
  getDebugInfo(@CurrentUser() user: JwtPayload) {
    return this.kycService.getDebugInfo(user.sub);
  }

  @Get('gold/eligibility')
  getGoldEligibility(@CurrentUser() user: JwtPayload) {
    return this.kycService.checkGoldEligibility(user.sub);
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  recalculateTier(@CurrentUser() user: JwtPayload) {
    return this.kycService.recalculateTier(user.sub);
  }
}

@Controller('kyc')
@Roles('moderator', 'super_admin')
export class KycAdminController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  listPending(@Query('type') type?: string) {
    return this.kycService.listPending(type);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.kycService.approve(id, user.sub);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectKycDto,
  ) {
    return this.kycService.reject(id, user.sub, dto.reason);
  }
}
