import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const JWT_USER = {
  sub: 'user-1',
  email: 'test@example.com',
  role: 'user',
  kycLevel: 0,
  accountType: 'individual',
};
const MOCK_PROFILE = {
  id: 'user-1',
  email: 'test@example.com',
  profile: null,
  reputation: null,
};

const mockUsersService = {
  getMyProfile: jest.fn().mockResolvedValue(MOCK_PROFILE),
  updateProfile: jest
    .fn()
    .mockResolvedValue({ ...MOCK_PROFILE, bio: 'updated' }),
  getPublicProfile: jest.fn().mockResolvedValue({ id: 'user-1' }),
  getAvatarUploadUrl: jest
    .fn()
    .mockResolvedValue({
      uploadUrl: 'https://r2.example.com',
      key: 'k',
      expiresIn: 300,
    }),
  confirmAvatarUpload: jest
    .fn()
    .mockResolvedValue({ avatarUrl: 'https://cdn.example.com/k' }),
  getKycUploadUrl: jest
    .fn()
    .mockResolvedValue({
      uploadUrl: 'https://r2.example.com',
      key: 'k',
      expiresIn: 300,
    }),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.resetAllMocks();
    Object.assign(mockUsersService, {
      getMyProfile: jest.fn().mockResolvedValue(MOCK_PROFILE),
      updateProfile: jest
        .fn()
        .mockResolvedValue({ ...MOCK_PROFILE, bio: 'updated' }),
      getPublicProfile: jest.fn().mockResolvedValue({ id: 'user-1' }),
      getAvatarUploadUrl: jest
        .fn()
        .mockResolvedValue({
          url: 'https://r2.example.com',
          fields: {},
          key: 'k',
          expiresIn: 300,
        }),
      confirmAvatarUpload: jest
        .fn()
        .mockResolvedValue({ avatarUrl: 'https://cdn.example.com/k' }),
      getKycUploadUrl: jest
        .fn()
        .mockResolvedValue({
          url: 'https://r2.example.com',
          fields: {},
          key: 'k',
          expiresIn: 300,
        }),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('getMyProfile() delegates with userId', async () => {
    await controller.getMyProfile(JWT_USER);
    expect(mockUsersService.getMyProfile).toHaveBeenCalledWith('user-1');
  });

  it('updateProfile() delegates with userId and dto', async () => {
    await controller.updateProfile(JWT_USER, { bio: 'hola' });
    expect(mockUsersService.updateProfile).toHaveBeenCalledWith('user-1', {
      bio: 'hola',
    });
  });

  it('getPublicProfile() delegates with param id', async () => {
    await controller.getPublicProfile('user-1');
    expect(mockUsersService.getPublicProfile).toHaveBeenCalledWith('user-1');
  });

  it('getAvatarUploadUrl() delegates with userId', async () => {
    await controller.getAvatarUploadUrl(JWT_USER);
    expect(mockUsersService.getAvatarUploadUrl).toHaveBeenCalledWith('user-1');
  });

  it('confirmAvatarUpload() delegates with userId and key', async () => {
    await controller.confirmAvatarUpload(JWT_USER, {
      key: 'avatars/user-1/file.jpg',
    });
    expect(mockUsersService.confirmAvatarUpload).toHaveBeenCalledWith(
      'user-1',
      'avatars/user-1/file.jpg',
    );
  });

  it('getKycUploadUrl() delegates with userId and type', async () => {
    await controller.getKycUploadUrl(JWT_USER, 'dni');
    expect(mockUsersService.getKycUploadUrl).toHaveBeenCalledWith(
      'user-1',
      'dni',
    );
  });
});
