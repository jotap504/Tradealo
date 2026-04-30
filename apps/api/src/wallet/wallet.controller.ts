import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { WalletService } from './wallet.service'
import { Public } from '../common/decorators/public.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @HttpCode(HttpStatus.OK)
  getBalance(@CurrentUser() user: JwtPayload) {
    return this.walletService.getBalance(user.sub)
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  getTransactionHistory(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.walletService.getTransactionHistory(user.sub, cursor, limit)
  }

  @Public()
  @Get('token-packs')
  @HttpCode(HttpStatus.OK)
  getTokenPacks(@Query('country') country = 'AR') {
    return this.walletService.getTokenPacks(country)
  }

  @Get('free-quota')
  @HttpCode(HttpStatus.OK)
  getFreeQuota(@CurrentUser() user: JwtPayload) {
    return this.walletService.getFreeQuota(user.sub)
  }
}
