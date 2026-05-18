import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { ConfigService } from '../config/config.service';
import { WalletService } from '../wallet/wallet.service';
import { StorageService } from '../storage/storage.service';
import * as schema from '../database/schema';

type DB = NodePgDatabase<typeof schema>;
type UserVerificationType =
  (typeof schema.userVerifications.$inferInsert)['type'];
type UserUploadType = 'dni' | 'address' | 'selfie';

const MAX_KYC_DOCUMENT_BYTES = 5 * 1024 * 1024;

const KYC_LEVEL_MAP: Record<string, number> = {
  email: 1,
  phone: 1,
  dni: 2,
  address: 2,
  selfie: 2,
};

const KYC_REWARD_KEY: Record<string, string> = {
  phone: 'kyc.reward.phone',
  dni: 'kyc.reward.dni',
  address: 'kyc.reward.address',
  selfie: 'kyc.reward.selfie',
};

@Injectable()
export class KycService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly storage: StorageService,
  ) {}

  async getStatus(userId: string) {
    const verifications = await this.db
      .select({
        type: schema.userVerifications.type,
        status: schema.userVerifications.status,
      })
      .from(schema.userVerifications)
      .where(eq(schema.userVerifications.userId, userId));

    const [user] = await this.db
      .select({ kycLevel: schema.users.kycLevel })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const approved = new Set(
      verifications.filter((v) => v.status === 'approved').map((v) => v.type),
    );

    return {
      id: approved.has('dni'),
      selfie: approved.has('selfie'),
      address: approved.has('address'),
      level: user?.kycLevel ?? 0,
    };
  }

  async uploadDocument(
    userId: string,
    type: UserUploadType,
    base64: string,
    mimetype: string,
  ) {
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.byteLength === 0) {
      throw new BadRequestException('Empty document');
    }
    if (buffer.byteLength > MAX_KYC_DOCUMENT_BYTES) {
      throw new BadRequestException('El documento no puede superar 5 MB');
    }

    const ext = mimetype.split('/')[1] ?? 'bin';
    const key = `kyc/${userId}/${type}/${randomUUID()}.${ext}`;
    await this.storage.uploadBuffer(key, buffer, mimetype);

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.userVerifications)
        .where(
          and(
            eq(schema.userVerifications.userId, userId),
            eq(schema.userVerifications.type, type as UserVerificationType),
          ),
        );
      await tx.insert(schema.userVerifications).values({
        userId,
        type: type as UserVerificationType,
        status: 'pending',
        s3Key: key,
      });
    });

    return { ok: true as const };
  }

  async listPending(type?: string) {
    const conditions = [eq(schema.userVerifications.status, 'pending')];
    if (type) {
      conditions.push(
        eq(
          schema.userVerifications.type,
          type as (typeof schema.userVerifications.$inferSelect)['type'],
        ),
      );
    }

    return this.db
      .select()
      .from(schema.userVerifications)
      .where(and(...conditions))
      .limit(100);
  }

  async approve(verificationId: string, reviewerId: string) {
    const [verification] = await this.db
      .select()
      .from(schema.userVerifications)
      .where(eq(schema.userVerifications.id, verificationId))
      .limit(1);

    if (!verification) throw new NotFoundException('VERIFICATION_NOT_FOUND');
    if (verification.status !== 'pending') {
      throw new BadRequestException('VERIFICATION_NOT_PENDING');
    }

    await this.db
      .update(schema.userVerifications)
      .set({
        status: 'approved',
        verifiedAt: new Date(),
        verifiedBy: reviewerId,
      })
      .where(eq(schema.userVerifications.id, verificationId));

    const [user] = await this.db
      .select({ kycLevel: schema.users.kycLevel })
      .from(schema.users)
      .where(eq(schema.users.id, verification.userId))
      .limit(1);

    const newLevel = KYC_LEVEL_MAP[verification.type] ?? 1;
    if (user && newLevel > (user.kycLevel ?? 0)) {
      await this.db
        .update(schema.users)
        .set({ kycLevel: newLevel, updatedAt: new Date() })
        .where(eq(schema.users.id, verification.userId));
    }

    const rewardKey = KYC_REWARD_KEY[verification.type];
    if (rewardKey) {
      const reward = await this.configService.getNumber(rewardKey, 0);
      if (reward > 0) {
        const reason =
          `kyc_${verification.type}` as (typeof schema.creditTransactions.$inferInsert)['reason'];
        await this.walletService.credit(verification.userId, reward, reason);
      }
    }

    return { verificationId, status: 'approved', userId: verification.userId };
  }

  async reject(verificationId: string, reviewerId: string, reason: string) {
    const [verification] = await this.db
      .select({
        id: schema.userVerifications.id,
        status: schema.userVerifications.status,
      })
      .from(schema.userVerifications)
      .where(eq(schema.userVerifications.id, verificationId))
      .limit(1);

    if (!verification) throw new NotFoundException('VERIFICATION_NOT_FOUND');
    if (verification.status !== 'pending') {
      throw new BadRequestException('VERIFICATION_NOT_PENDING');
    }

    await this.db
      .update(schema.userVerifications)
      .set({
        status: 'rejected',
        rejectionReason: reason,
        verifiedBy: reviewerId,
        verifiedAt: new Date(),
      })
      .where(eq(schema.userVerifications.id, verificationId));

    return { verificationId, status: 'rejected' };
  }
}
