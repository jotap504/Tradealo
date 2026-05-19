import { Test, TestingModule } from '@nestjs/testing'
import { WalletController } from './wallet.controller'
import { WalletService } from './wallet.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

const JWT_USER = { sub: 'user-1', email: 'test@example.com', role: 'user', kycLevel: 0, accountType: 'individual' }

const mockWalletService = {
  getBalance: jest.fn().mockResolvedValue({ userId: 'user-1', balance: 10, lifetimeEarned: 15, lifetimeSpent: 5, updatedAt: new Date() }),
  getTransactionHistory: jest.fn().mockResolvedValue({ data: [], nextCursor: null, hasMore: false }),
  getTokenPacks: jest.fn().mockResolvedValue([]),
  getFreeQuota: jest.fn().mockResolvedValue({ quota: 5, used: 1, remaining: 4 }),
}

describe('WalletController', () => {
  let controller: WalletController

  beforeEach(async () => {
    jest.resetAllMocks()
    Object.assign(mockWalletService, {
      getBalance: jest.fn().mockResolvedValue({ userId: 'user-1', balance: 10, lifetimeEarned: 15, lifetimeSpent: 5, updatedAt: new Date() }),
      getTransactionHistory: jest.fn().mockResolvedValue({ data: [], nextCursor: null, hasMore: false }),
      getTokenPacks: jest.fn().mockResolvedValue([]),
      getFreeQuota: jest.fn().mockResolvedValue({ quota: 5, used: 1, remaining: 4 }),
    })

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [{ provide: WalletService, useValue: mockWalletService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<WalletController>(WalletController)
  })

  it('getBalance() delegates to WalletService with userId', async () => {
    await controller.getBalance(JWT_USER)
    expect(mockWalletService.getBalance).toHaveBeenCalledWith('user-1')
  })

  it('getTransactionHistory() delegates with cursor and limit', async () => {
    await controller.getTransactionHistory(JWT_USER, 'some_cursor', 10)
    expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith('user-1', 'some_cursor', 10)
  })

  it('getTransactionHistory() uses default limit=20 when omitted', async () => {
    await controller.getTransactionHistory(JWT_USER, undefined, 20)
    expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith('user-1', undefined, 20)
  })

  it('getTokenPacks() delegates with country param', async () => {
    await controller.getTokenPacks('AR')
    expect(mockWalletService.getTokenPacks).toHaveBeenCalledWith('AR')
  })

  it('getTokenPacks() uses AR as default country', async () => {
    await controller.getTokenPacks()
    expect(mockWalletService.getTokenPacks).toHaveBeenCalledWith('AR')
  })

  it('getFreeQuota() delegates to WalletService with userId', async () => {
    await controller.getFreeQuota(JWT_USER)
    expect(mockWalletService.getFreeQuota).toHaveBeenCalledWith('user-1')
  })
})
