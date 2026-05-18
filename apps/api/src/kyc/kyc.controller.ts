import {
  Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import { KycService } from './kyc.service'
import { RejectKycDto } from './dto/review-kyc.dto'
import { UploadKycDocumentDto } from './dto/upload-kyc-document.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  getStatus(@CurrentUser() user: JwtPayload) {
    return this.kycService.getStatus(user.sub)
  }

  @Post('id')
  @HttpCode(HttpStatus.OK)
  uploadId(@CurrentUser() user: JwtPayload, @Body() dto: UploadKycDocumentDto) {
    return this.kycService.uploadDocument(user.sub, 'dni', dto.data, dto.mimetype)
  }

  @Post('selfie')
  @HttpCode(HttpStatus.OK)
  uploadSelfie(@CurrentUser() user: JwtPayload, @Body() dto: UploadKycDocumentDto) {
    return this.kycService.uploadDocument(user.sub, 'selfie', dto.data, dto.mimetype)
  }

  @Post('address')
  @HttpCode(HttpStatus.OK)
  uploadAddress(@CurrentUser() user: JwtPayload, @Body() dto: UploadKycDocumentDto) {
    return this.kycService.uploadDocument(user.sub, 'address', dto.data, dto.mimetype)
  }
}

@Controller('kyc')
@Roles('moderator', 'super_admin')
export class KycAdminController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  listPending(@Query('type') type?: string) {
    return this.kycService.listPending(type)
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.kycService.approve(id, user.sub)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectKycDto,
  ) {
    return this.kycService.reject(id, user.sub, dto.reason)
  }
}
