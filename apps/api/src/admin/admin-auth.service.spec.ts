import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { AdminAuthService } from './admin-auth.service';
import { DRIZZLE_TOKEN } from '../database/database.module';

jest.mock('speakeasy');

const ADMIN_ID = 'admin-uuid-001';
const ADMIN_EMAIL = 'admin@trocalia.com.ar';
const ADMIN_ROLE = 'super_admin';
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

const mockAdmin = {
  id: ADMIN_ID,
  email: ADMIN_EMAIL,
  passwordHash: bcrypt.hashSync('Password123!', 10),
  role: ADMIN_ROLE,
  totpSecret: TOTP_SECRET,
  totpEnabled: false,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
};

const qb = (rows: unknown[]) => ({
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue(rows),
});

const updateQb = () => ({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue([]),
});

const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
};

describe('AdminAuthService', () => {
  let service: AdminAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
  });

  describe('login()', () => {
    it('returns preAuthToken on valid credentials', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockAdmin]));

      const result = await service.login(ADMIN_EMAIL, 'Password123!');
      expect(result.preAuthToken).toBe('signed-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: ADMIN_ID, preAuth: true }),
        expect.objectContaining({ expiresIn: 300 }),
      );
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockAdmin]));
      await expect(service.login(ADMIN_EMAIL, 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when admin not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]));
      await expect(
        service.login('nobody@trocalia.com.ar', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when admin is inactive', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ ...mockAdmin, isActive: false }]),
      );
      await expect(service.login(ADMIN_EMAIL, 'Password123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('setupTotp()', () => {
    const mockSecret = {
      base32: TOTP_SECRET,
      otpauth_url:
        'otpauth://totp/Trocalia%20Admin%20%28admin%40trocalia.com.ar%29?secret=JBSWY3DPEHPK3PXP',
    };

    beforeEach(() => {
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
    });

    it('returns secret and otpauthUrl', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ totpEnabled: false, email: ADMIN_EMAIL }]),
      );
      mockDb.update.mockReturnValueOnce(updateQb());

      const result = await service.setupTotp(ADMIN_ID);
      expect(result.secret).toBe(TOTP_SECRET);
      expect(result.otpauthUrl).toBe(mockSecret.otpauth_url);
    });

    it('throws ConflictException when TOTP already enabled', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ totpEnabled: true, email: ADMIN_EMAIL }]),
      );
      await expect(service.setupTotp(ADMIN_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws UnauthorizedException when admin not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]));
      await expect(service.setupTotp(ADMIN_ID)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('confirmTotp()', () => {
    it('enables TOTP when code is valid', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ totpSecret: TOTP_SECRET, totpEnabled: false }]),
      );
      mockDb.update.mockReturnValueOnce(updateQb());
      (speakeasy.totp.verify as jest.Mock).mockReturnValueOnce(true);

      await expect(
        service.confirmTotp(ADMIN_ID, '123456'),
      ).resolves.not.toThrow();
    });

    it('throws UnauthorizedException for invalid code', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ totpSecret: TOTP_SECRET, totpEnabled: false }]),
      );
      (speakeasy.totp.verify as jest.Mock).mockReturnValueOnce(false);
      await expect(service.confirmTotp(ADMIN_ID, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws ConflictException when TOTP already enabled', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ totpSecret: TOTP_SECRET, totpEnabled: true }]),
      );
      await expect(service.confirmTotp(ADMIN_ID, '123456')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException when no secret set', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ totpSecret: null, totpEnabled: false }]),
      );
      await expect(service.confirmTotp(ADMIN_ID, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyTotp()', () => {
    const enabledAdmin = {
      totpSecret: TOTP_SECRET,
      totpEnabled: true,
      email: ADMIN_EMAIL,
      role: ADMIN_ROLE,
    };

    it('returns adminToken on valid TOTP code', async () => {
      mockDb.select.mockReturnValueOnce(qb([enabledAdmin]));
      mockDb.update.mockReturnValueOnce(updateQb());
      (speakeasy.totp.verify as jest.Mock).mockReturnValueOnce(true);

      const result = await service.verifyTotp(ADMIN_ID, '123456');
      expect(result.adminToken).toBe('signed-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: ADMIN_ID, isAdminSession: true }),
        expect.any(Object),
      );
    });

    it('throws UnauthorizedException for invalid TOTP code', async () => {
      mockDb.select.mockReturnValueOnce(qb([enabledAdmin]));
      (speakeasy.totp.verify as jest.Mock).mockReturnValueOnce(false);
      await expect(service.verifyTotp(ADMIN_ID, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws BadRequestException when TOTP not enabled', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ ...enabledAdmin, totpEnabled: false }]),
      );
      await expect(service.verifyTotp(ADMIN_ID, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
