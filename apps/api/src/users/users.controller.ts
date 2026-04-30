import { Controller, Get, Patch, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ConfirmAvatarDto } from './dto/confirm-avatar.dto'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMyProfile(user.sub)
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto)
  }

  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id)
  }

  @Post('me/avatar/upload-url')
  @HttpCode(HttpStatus.OK)
  getAvatarUploadUrl(@CurrentUser() user: JwtPayload) {
    return this.usersService.getAvatarUploadUrl(user.sub)
  }

  @Post('me/avatar/confirm')
  @HttpCode(HttpStatus.OK)
  confirmAvatarUpload(@CurrentUser() user: JwtPayload, @Body() dto: ConfirmAvatarDto) {
    return this.usersService.confirmAvatarUpload(user.sub, dto.key)
  }

  @Post('me/kyc/:type/upload-url')
  @HttpCode(HttpStatus.OK)
  getKycUploadUrl(@CurrentUser() user: JwtPayload, @Param('type') type: string) {
    return this.usersService.getKycUploadUrl(user.sub, type)
  }
}
