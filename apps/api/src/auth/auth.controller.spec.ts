import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const TOKEN_PAIR = {
  accessToken: 'mock_access',
  refreshToken: 'mock_refresh',
  expiresIn: 900,
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user',
    kycLevel: 0,
    referralCode: 'CODE',
    createdAt: new Date(),
  },
};

const mockAuthService = {
  register: jest.fn().mockResolvedValue(TOKEN_PAIR),
  login: jest.fn().mockResolvedValue(TOKEN_PAIR),
  refresh: jest
    .fn()
    .mockResolvedValue({
      accessToken: 'new_access',
      refreshToken: 'new_refresh',
      expiresIn: 900,
    }),
  logout: jest.fn().mockResolvedValue(undefined),
  getMe: jest.fn().mockResolvedValue({ ...TOKEN_PAIR.user, profile: null }),
};

const JWT_USER = {
  sub: 'user-1',
  email: 'test@example.com',
  role: 'user',
  kycLevel: 0,
  accountType: 'individual',
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.resetAllMocks();
    Object.assign(mockAuthService, {
      register: jest.fn().mockResolvedValue(TOKEN_PAIR),
      login: jest.fn().mockResolvedValue(TOKEN_PAIR),
      refresh: jest
        .fn()
        .mockResolvedValue({
          accessToken: 'new_access',
          refreshToken: 'new_refresh',
          expiresIn: 900,
        }),
      logout: jest.fn().mockResolvedValue(undefined),
      getMe: jest.fn().mockResolvedValue({ ...TOKEN_PAIR.user, profile: null }),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('register() delegates to AuthService.register', async () => {
    const result = await controller.register({
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password1',
    });
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password1',
    });
    expect(result).toEqual(TOKEN_PAIR);
  });

  it('login() delegates to AuthService.login', async () => {
    const result = await controller.login({
      email: 'test@example.com',
      password: 'Password1',
    });
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password1',
    });
    expect(result).toEqual(TOKEN_PAIR);
  });

  it('refresh() delegates to AuthService.refresh', async () => {
    const result = await controller.refresh({ refreshToken: 'raw_token' });
    expect(mockAuthService.refresh).toHaveBeenCalledWith('raw_token');
    expect(result.accessToken).toBe('new_access');
  });

  it('logout() delegates to AuthService.logout with userId from JWT', async () => {
    await controller.logout(JWT_USER, { refreshToken: 'raw_token' });
    expect(mockAuthService.logout).toHaveBeenCalledWith('user-1', 'raw_token');
  });

  it('me() delegates to AuthService.getMe with userId from JWT', async () => {
    const result = await controller.me(JWT_USER, {} as any);
    expect(mockAuthService.getMe).toHaveBeenCalledWith('user-1');
    expect(result.id).toBe('user-1');
  });
});
