import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { ConfigService } from '../config/config.service';
import { WalletService } from '../wallet/wallet.service';
import { StorageService } from '../storage/storage.service';
import { BcraProvider } from './bcra-provider';
import { VisionProvider } from './vision-provider';
import * as schema from '../database/schema';

type DB = NodePgDatabase<typeof schema>;
type UserVerificationType =
  (typeof schema.userVerifications.$inferInsert)['type'];
type UserUploadType = 'dni' | 'address' | 'selfie';

const MAX_KYC_DOCUMENT_BYTES = 5 * 1024 * 1024;
const GOLD_MIN_REVIEWS = 50;
const GOLD_MAX_BAD_PCT = 10;

const KYC_LEVEL_MAP: Record<string, number> = {
  email: 1,
  phone: 1,
  dni: 1,
  address: 1,
  selfie: 1,
  phone_camera: 1,
  bcra_consent: 1,
};

const KYC_REWARD_KEY: Record<string, string> = {
  phone: 'kyc.reward.phone',
  dni: 'kyc.reward.dni',
  address: 'kyc.reward.address',
  selfie: 'kyc.reward.selfie',
};

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly storage: StorageService,
    private readonly bcraProvider: BcraProvider,
    private readonly visionProvider: VisionProvider,
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
      .select({
        kycLevel: schema.users.kycLevel,
        accountType: schema.users.accountType,
        silverGrantedAt: schema.users.silverGrantedAt,
        goldGrantedAt: schema.users.goldGrantedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const approved = new Set(
      verifications.filter((v) => v.status === 'approved').map((v) => v.type),
    );

    const tier = user?.kycLevel ?? 0;

    return {
      id: approved.has('dni'),
      selfie: approved.has('selfie'),
      address: approved.has('address'),
      phoneCamera: approved.has('phone_camera'),
      bcraConsent: approved.has('bcra_consent'),
      level: tier,
      accountType: user?.accountType ?? 'individual',
      silverGrantedAt: user?.silverGrantedAt ?? null,
      goldGrantedAt: user?.goldGrantedAt ?? null,
    };
  }

  async getTierProgress(userId: string) {
    const status = await this.getStatus(userId);

    const silverSteps = {
      selfie: status.selfie,
      phoneCamera: status.phoneCamera,
      bcraConsent: status.bcraConsent,
    };

    const goldEligibility = await this.checkGoldEligibility(userId);

    return {
      currentTier: status.level,
      accountType: status.accountType,
      silver: {
        granted: status.level >= 1,
        grantedAt: status.silverGrantedAt,
        steps: silverSteps,
        stepsCompleted: Object.values(silverSteps).filter(Boolean).length,
        stepsTotal: Object.keys(silverSteps).length,
      },
      gold: {
        granted: status.level >= 2,
        grantedAt: status.goldGrantedAt,
        eligible: goldEligibility.eligible,
        progress: goldEligibility,
      },
    };
  }

  async uploadPhoneCamera(
    userId: string,
    frontBase64: string,
    frontMimetype: string,
    backBase64: string,
    backMimetype: string,
  ) {
    const frontBuffer = Buffer.from(frontBase64, 'base64');
    const backBuffer = Buffer.from(backBase64, 'base64');
    if (frontBuffer.byteLength === 0 || backBuffer.byteLength === 0) {
      throw new BadRequestException('Empty document');
    }
    if (
      frontBuffer.byteLength > MAX_KYC_DOCUMENT_BYTES ||
      backBuffer.byteLength > MAX_KYC_DOCUMENT_BYTES
    ) {
      throw new BadRequestException('El documento no puede superar 5 MB');
    }

    const frontExt = frontMimetype.split('/')[1] ?? 'bin';
    const backExt = backMimetype.split('/')[1] ?? 'bin';
    const frontKey = `kyc/${userId}/phone_camera/front/${randomUUID()}.${frontExt}`;
    const backKey = `kyc/${userId}/phone_camera/back/${randomUUID()}.${backExt}`;
    await this.storage.uploadBuffer(frontKey, frontBuffer, frontMimetype);
    await this.storage.uploadBuffer(backKey, backBuffer, backMimetype);

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.userVerifications)
        .where(
          and(
            eq(schema.userVerifications.userId, userId),
            eq(
              schema.userVerifications.type,
              'phone_camera' as UserVerificationType,
            ),
          ),
        );
      await tx.insert(schema.userVerifications).values({
        userId,
        type: 'phone_camera' as UserVerificationType,
        status: 'pending',
        s3Key: frontKey,
        verificationData: JSON.stringify({ backKey }),
      });
    });

    void this.autoValidateDni(
      userId,
      frontBase64,
      frontMimetype,
      backBase64,
      backMimetype,
    );

    return { ok: true as const };
  }

  private async autoValidateDni(
    userId: string,
    frontBase64: string,
    frontMimeType = 'image/jpeg',
    backBase64?: string,
    backMimeType = 'image/jpeg',
  ) {
    // Try front first, then back — approve if either is recognized
    let result;
    try {
      result = await this.visionProvider.validateDniPhoto(
        frontBase64,
        frontMimeType,
      );
    } catch (err) {
      this.logger.error('autoValidateDni: front vision call threw', err);
      return;
    }

    if ((!result.valid || result.indeterminate) && backBase64) {
      this.logger.log(
        `autoValidateDni: front result valid=${result.valid} indeterminate=${result.indeterminate ?? false}, trying back photo`,
      );
      try {
        result = await this.visionProvider.validateDniPhoto(
          backBase64,
          backMimeType,
        );
      } catch (err) {
        this.logger.error('autoValidateDni: back vision call threw', err);
      }
    }

    if (result?.valid) {
      if (result.extractedData?.dniNumber) {
        await this.db
          .update(schema.userVerifications)
          .set({ verificationData: JSON.stringify(result.extractedData) })
          .where(
            and(
              eq(schema.userVerifications.userId, userId),
              eq(
                schema.userVerifications.type,
                'phone_camera' as UserVerificationType,
              ),
            ),
          );
      }
      await this.autoApproveVerification(userId, 'phone_camera');
    } else if (result?.indeterminate) {
      // AI blocked or couldn't process — leave as pending for manual admin review
      this.logger.warn(
        `autoValidateDni: both photos indeterminate for user ${userId}, leaving pending`,
      );
    } else {
      // Gemini explicitly said neither photo is a DNI
      await this.db
        .update(schema.userVerifications)
        .set({
          status: 'rejected',
          rejectionReason:
            'No se reconoció el DNI en las imágenes. Intentalo de nuevo con mejor luz y encuadre.',
        })
        .where(
          and(
            eq(schema.userVerifications.userId, userId),
            eq(
              schema.userVerifications.type,
              'phone_camera' as UserVerificationType,
            ),
          ),
        );
    }
  }

  async recordBcraConsent(userId: string, consentText: string) {
    const consentToken = randomUUID();

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.userVerifications)
        .where(
          and(
            eq(schema.userVerifications.userId, userId),
            eq(
              schema.userVerifications.type,
              'bcra_consent' as UserVerificationType,
            ),
          ),
        );
      await tx.insert(schema.userVerifications).values({
        userId,
        type: 'bcra_consent' as UserVerificationType,
        status: 'pending',
        verificationData: consentText,
      });

      await tx
        .update(schema.users)
        .set({
          bcraConsentGrantedAt: new Date(),
          bcraConsentExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    });

    // Trigger BCRA check (fire-and-forget)
    this.runBcraCheck(userId, consentToken).catch((err) =>
      console.error('BCRA check error:', err),
    );

    return { ok: true as const };
  }

  private async runBcraCheck(userId: string, consentToken: string) {
    // Get DNI extracted by Gemini Vision during phone_camera validation
    const [phoneCam] = await this.db
      .select({ verificationData: schema.userVerifications.verificationData })
      .from(schema.userVerifications)
      .where(
        and(
          eq(schema.userVerifications.userId, userId),
          eq(
            schema.userVerifications.type,
            'phone_camera' as UserVerificationType,
          ),
        ),
      )
      .limit(1);

    let identifier = '';
    if (phoneCam?.verificationData) {
      try {
        const parsed = JSON.parse(
          phoneCam.verificationData as string,
        ) as Record<string, unknown>;
        identifier = String(parsed.dniNumber ?? '');
      } catch {
        /* ignore */
      }
    }

    const result = await this.bcraProvider.consult(identifier);

    await this.db.insert(schema.bcraChecks).values({
      userId,
      cuitDni: identifier,
      consentToken,
      status: result.status,
      score: result.score,
      summary: result.summary,
      rawResponse: result.rawData,
      checkedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    if (result.status === 'passed') {
      await this.autoApproveVerification(userId, 'bcra_consent');
    }
  }

  private async autoApproveVerification(
    userId: string,
    type: UserVerificationType,
  ) {
    await this.db
      .update(schema.userVerifications)
      .set({ status: 'approved', verifiedAt: new Date() })
      .where(
        and(
          eq(schema.userVerifications.userId, userId),
          eq(schema.userVerifications.type, type),
        ),
      );

    await this.tryUpgradeToSilver(userId);
  }

  async tryUpgradeToSilver(userId: string) {
    const status = await this.getStatus(userId);

    const allSilverSteps =
      status.selfie && status.phoneCamera && status.bcraConsent;

    if (!allSilverSteps) return { upgraded: false };

    const [user] = await this.db
      .select({ kycLevel: schema.users.kycLevel })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (user && user.kycLevel < 1) {
      await this.db
        .update(schema.users)
        .set({
          kycLevel: 1,
          silverGrantedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    }

    return { upgraded: true };
  }

  async checkGoldEligibility(userId: string) {
    const [user] = await this.db
      .select({ kycLevel: schema.users.kycLevel })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user || user.kycLevel < 1) {
      return {
        eligible: false,
        reason: 'Se requiere nivel Silver primero',
        totalReviews: 0,
        positiveReviews: 0,
        badReviews: 0,
        badPct: 0,
      };
    }

    const [stats] = await this.db
      .select({
        totalReviews: sql<number>`count(*)::int`,
        positiveReviews: sql<number>`count(*) filter (where overall_rating >= 4)::int`,
        badReviews: sql<number>`count(*) filter (where overall_rating = 1)::int`,
      })
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.reviewedId, userId),
          sql`${schema.reviews.direction} in ('buyer_to_seller', 'seller_to_buyer')`,
        ),
      );

    const total = stats?.totalReviews ?? 0;
    const bad = stats?.badReviews ?? 0;
    const positive = stats?.positiveReviews ?? 0;
    const badPct = total > 0 ? (bad / total) * 100 : 0;

    if (total < GOLD_MIN_REVIEWS) {
      return {
        eligible: false,
        reason: `Faltan ${GOLD_MIN_REVIEWS - total} calificaciones para llegar a Gold`,
        totalReviews: total,
        positiveReviews: positive,
        badReviews: bad,
        badPct: Math.round(badPct * 100) / 100,
      };
    }

    if (badPct > GOLD_MAX_BAD_PCT) {
      return {
        eligible: false,
        reason: `Tiene ${badPct.toFixed(1)}% de calificaciones negativas (máx. ${GOLD_MAX_BAD_PCT}%)`,
        totalReviews: total,
        positiveReviews: positive,
        badReviews: bad,
        badPct: Math.round(badPct * 100) / 100,
      };
    }

    return {
      eligible: true,
      reason: null,
      totalReviews: total,
      positiveReviews: positive,
      badReviews: bad,
      badPct: Math.round(badPct * 100) / 100,
    };
  }

  async tryUpgradeToGold(userId: string) {
    const eligibility = await this.checkGoldEligibility(userId);

    if (!eligibility.eligible) {
      return { upgraded: false, reason: eligibility.reason };
    }

    await this.db
      .update(schema.users)
      .set({
        kycLevel: 2,
        goldGrantedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));

    return { upgraded: true };
  }

  async getDebugInfo(userId: string) {
    const verifications = await this.db
      .select()
      .from(schema.userVerifications)
      .where(eq(schema.userVerifications.userId, userId));

    const visionMode = this.visionProvider['mode'] as string;
    const visionModel = this.visionProvider['model'] as string;
    const visionUrl = this.visionProvider['apiUrl'] as string;
    const hasKey = !!(this.visionProvider['apiKey'] as string);

    return {
      verifications: verifications.map((v) => ({
        type: v.type,
        status: v.status,
        rejectionReason: v.rejectionReason,
        verificationData: v.verificationData,
        createdAt: v.createdAt,
        verifiedAt: v.verifiedAt,
      })),
      visionProvider: {
        mode: visionMode,
        model: visionModel,
        apiUrl: visionUrl,
        hasKey,
      },
    };
  }

  async getBcraResult(userId: string) {
    const [check] = await this.db
      .select()
      .from(schema.bcraChecks)
      .where(eq(schema.bcraChecks.userId, userId))
      .orderBy(sql`checked_at desc`)
      .limit(1);
    return check ?? null;
  }

  async recalculateTier(userId: string) {
    const [user] = await this.db
      .select({ kycLevel: schema.users.kycLevel })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    if (user.kycLevel >= 2) {
      const eligibility = await this.checkGoldEligibility(userId);
      if (!eligibility.eligible) {
        await this.db
          .update(schema.users)
          .set({
            kycLevel: 1,
            goldGrantedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, userId));
        return { tier: 1, downgraded: true };
      }
    }

    if (user.kycLevel < 1) {
      await this.tryUpgradeToSilver(userId);
    }

    return { tier: user.kycLevel, downgraded: false };
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

    if (type === 'selfie') {
      void this.autoValidateSelfie(userId, base64);
    }

    return { ok: true as const };
  }

  private async autoValidateSelfie(userId: string, base64: string) {
    let result;
    try {
      result = await this.visionProvider.validateSelfie(base64);
    } catch (err) {
      this.logger.error(
        'autoValidateSelfie: vision call threw unexpectedly',
        err,
      );
      return;
    }

    if (result.valid) {
      await this.autoApproveVerification(userId, 'selfie');
    } else {
      await this.db
        .update(schema.userVerifications)
        .set({
          status: 'rejected',
          rejectionReason:
            'No se reconoció la selfie con DNI. Asegurate de sostener el documento bien visible.',
        })
        .where(
          and(
            eq(schema.userVerifications.userId, userId),
            eq(schema.userVerifications.type, 'selfie' as UserVerificationType),
          ),
        );
    }
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
