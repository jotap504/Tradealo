import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { KycService } from './kyc.service';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { ConfigService } from '../config/config.service';
import { WalletService } from '../wallet/wallet.service';
import { StorageService } from '../storage/storage.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qb(result: unknown): any {
  const chain: any = {};
  ['from', 'where', 'limit', 'orderBy', 'returning'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  chain.catch = () => Promise.resolve(result);
  return chain;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateQb(result: unknown = []): any {
  const where = jest.fn().mockResolvedValue(result);
  const set = jest.fn().mockReturnValue({ where });
  return { set };
}

const REVIEWER_ID = 'moderator-uuid-001';
const VERIFICATION_ID = 'verif-uuid-001';
const USER_ID = 'user-uuid-001';

const mockVerification = {
  id: VERIFICATION_ID,
  userId: USER_ID,
  type: 'dni' as const,
  status: 'pending' as const,
  s3Key: 'kyc/user-uuid-001/dni/file.jpg',
  verificationData: null,
  rejectionReason: null,
  verifiedAt: null,
  verifiedBy: null,
  expiresAt: null,
  createdAt: new Date(),
};

const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
};

const mockConfigService = { getNumber: jest.fn() };
const mockWalletService = { credit: jest.fn() };
const mockStorageService = {
  uploadBuffer: jest.fn(),
  getPublicUrl: jest.fn(),
  getPresignedPut: jest.fn(),
  deleteObject: jest.fn(),
};

describe('KycService', () => {
  let service: KycService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfigService.getNumber.mockResolvedValue(5);
    mockWalletService.credit.mockResolvedValue({ balance: 15 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
  });

  describe('listPending()', () => {
    it('returns pending verifications', async () => {
      mockDb.select.mockReturnValueOnce(qb([mockVerification]));
      const result = await service.listPending();
      expect(result).toHaveLength(1);
    });

    it('filters by type when provided', async () => {
      mockDb.select.mockReturnValueOnce(qb([]));
      await service.listPending('dni');
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('approve()', () => {
    it('approves verification, updates kycLevel, and credits reward tokens', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([mockVerification])) // fetch verification
        .mockReturnValueOnce(qb([{ kycLevel: 0 }])); // fetch current kycLevel
      mockDb.update
        .mockReturnValueOnce(updateQb()) // update verification
        .mockReturnValueOnce(updateQb()); // update kycLevel

      const result = await service.approve(VERIFICATION_ID, REVIEWER_ID);
      expect(result.status).toBe('approved');
      expect(mockWalletService.credit).toHaveBeenCalledWith(
        USER_ID,
        5,
        'kyc_dni',
      );
    });

    it('does not upgrade kycLevel when user already has higher level', async () => {
      mockDb.select
        .mockReturnValueOnce(qb([{ ...mockVerification, type: 'phone' }]))
        .mockReturnValueOnce(qb([{ kycLevel: 2 }]));
      mockDb.update.mockReturnValueOnce(updateQb());

      await service.approve(VERIFICATION_ID, REVIEWER_ID);
      // update called once (verification), not twice (no kycLevel update)
      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it('skips reward when configService returns 0', async () => {
      mockConfigService.getNumber.mockResolvedValue(0);
      mockDb.select
        .mockReturnValueOnce(qb([mockVerification]))
        .mockReturnValueOnce(qb([{ kycLevel: 0 }]));
      mockDb.update
        .mockReturnValueOnce(updateQb())
        .mockReturnValueOnce(updateQb());

      await service.approve(VERIFICATION_ID, REVIEWER_ID);
      expect(mockWalletService.credit).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when verification not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]));
      await expect(
        service.approve(VERIFICATION_ID, REVIEWER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when verification is not pending', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ ...mockVerification, status: 'approved' }]),
      );
      await expect(
        service.approve(VERIFICATION_ID, REVIEWER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject()', () => {
    it('rejects verification with reason', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ id: VERIFICATION_ID, status: 'pending' }]),
      );
      mockDb.update.mockReturnValueOnce(updateQb());

      const result = await service.reject(
        VERIFICATION_ID,
        REVIEWER_ID,
        'Documento ilegible',
      );
      expect(result.status).toBe('rejected');
    });

    it('throws NotFoundException when verification not found', async () => {
      mockDb.select.mockReturnValueOnce(qb([]));
      await expect(
        service.reject(VERIFICATION_ID, REVIEWER_ID, 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when verification is not pending', async () => {
      mockDb.select.mockReturnValueOnce(
        qb([{ id: VERIFICATION_ID, status: 'rejected' }]),
      );
      await expect(
        service.reject(VERIFICATION_ID, REVIEWER_ID, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
