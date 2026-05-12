import {
  Controller, Get, Patch, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: JwtPayload): Promise<{ count: number }> {
    return this.notificationsService.countUnread(user.sub)
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('unread') unread?: string,
  ) {
    return this.notificationsService.findForUser(user.sub, unread === 'true')
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, id)
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.sub)
  }
}
