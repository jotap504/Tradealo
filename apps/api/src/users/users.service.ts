import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { randomUUID } from 'crypto'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { StorageService } from '../storage/storage.service'
import * as schema from '../database/schema'
import type { UpdateProfileDto } from './dto/update-profile.dto'

type DB = NodePgDatabase<typeof schema>
type User = typeof schema.users.$inferSelect
type UserProfile = typeof schema.userProfiles.$inferSelect

const KYC_UPLOAD_TYPES = ['dni', 'address', 'selfie'] as const
type KycUploadType = (typeof KYC_UPLOAD_TYPES)[number]


@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly storage: StorageService,
  ) {}

  async getMyProfile(userId: string) {
    const row = await this.fetchFullProfile(userId)
    if (!row) throw new NotFoundException('USER_NOT_FOUND')
    return row
  }

  async getPublicProfile(userId: string) {
    const row = await this.fetchPublicProfile(userId)
    if (!row) throw new NotFoundException('USER_NOT_FOUND')
    return row
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const [taken] = await this.db
        .select({ id: schema.userProfiles.userId })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.username, dto.username))
        .limit(1)

      if (taken && taken.id !== userId) {
        throw new ConflictException('USERNAME_TAKEN')
      }
    }

    const [user] = await this.db
      .select({
        emailVerified: schema.users.emailVerified,
        phoneVerified: schema.users.phoneVerified,
        kycLevel: schema.users.kycLevel,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    if (!user) throw new NotFoundException('USER_NOT_FOUND')

    const [updated] = await this.db
      .update(schema.userProfiles)
      .set({
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
        ...(dto.showPhone !== undefined && { showPhone: dto.showPhone }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.city !== undefined && { city: dto.city }),
        updatedAt: new Date(),
      })
      .where(eq(schema.userProfiles.userId, userId))
      .returning()

    if (!updated) throw new NotFoundException('USER_NOT_FOUND')

    const completeness = this.calculateCompleteness(user, updated)

    await this.db
      .update(schema.userProfiles)
      .set({ completenessPct: completeness })
      .where(eq(schema.userProfiles.userId, userId))

    return { ...updated, completenessPct: completeness }
  }

  async getAvatarUploadUrl(userId: string) {
    const key = `avatars/${userId}/${randomUUID()}.jpg`
    return this.storage.getPresignedPut(key, 'image/jpeg')
  }

  async confirmAvatarUpload(userId: string, key: string) {
    if (!key.startsWith(`avatars/${userId}/`)) {
      throw new BadRequestException('INVALID_AVATAR_KEY')
    }

    const avatarUrl = this.storage.getPublicUrl(key)

    const [updated] = await this.db
      .update(schema.userProfiles)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(schema.userProfiles.userId, userId))
      .returning({ avatarUrl: schema.userProfiles.avatarUrl })

    if (!updated) throw new NotFoundException('USER_NOT_FOUND')
    return { avatarUrl: updated.avatarUrl }
  }

  async getKycUploadUrl(userId: string, type: string) {
    if (!KYC_UPLOAD_TYPES.includes(type as KycUploadType)) {
      throw new BadRequestException(`Invalid KYC type. Valid: ${KYC_UPLOAD_TYPES.join(', ')}`)
    }

    const key = `kyc/${userId}/${type}/${randomUUID()}`
    const contentType = type === 'selfie' ? 'image/jpeg' : 'application/pdf'

    await this.db
      .insert(schema.userVerifications)
      .values({
        userId,
        type: type as typeof schema.userVerifications.$inferInsert['type'],
        status: 'pending',
        s3Key: key,
      })
      .onConflictDoUpdate({
        target: [schema.userVerifications.userId, schema.userVerifications.type],
        set: { status: 'pending', s3Key: key, rejectionReason: null, verifiedAt: null },
      })

    return this.storage.getPresignedPut(key, contentType)
  }

  private async fetchFullProfile(userId: string) {
    const rows = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        status: schema.users.status,
        kycLevel: schema.users.kycLevel,
        emailVerified: schema.users.emailVerified,
        phoneVerified: schema.users.phoneVerified,
        referralCode: schema.users.referralCode,
        createdAt: schema.users.createdAt,
        profile: schema.userProfiles,
        reputation: schema.reputationScores,
      })
      .from(schema.users)
      .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
      .leftJoin(schema.reputationScores, eq(schema.reputationScores.userId, schema.users.id))
      .where(eq(schema.users.id, userId))
      .limit(1)

    return rows[0] ?? null
  }

  private async fetchPublicProfile(userId: string) {
    const rows = await this.db
      .select({
        id: schema.users.id,
        role: schema.users.role,
        kycLevel: schema.users.kycLevel,
        createdAt: schema.users.createdAt,
        username: schema.userProfiles.username,
        firstName: schema.userProfiles.firstName,
        lastName: schema.userProfiles.lastName,
        avatarUrl: schema.userProfiles.avatarUrl,
        bio: schema.userProfiles.bio,
        province: schema.userProfiles.province,
        city: schema.userProfiles.city,
        completenessPct: schema.userProfiles.completenessPct,
        reputation: schema.reputationScores,
      })
      .from(schema.users)
      .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
      .leftJoin(schema.reputationScores, eq(schema.reputationScores.userId, schema.users.id))
      .where(and(eq(schema.users.id, userId), eq(schema.users.status, 'active')))
      .limit(1)

    return rows[0] ?? null
  }

  private calculateCompleteness(
    user: Pick<User, 'emailVerified' | 'phoneVerified' | 'kycLevel'>,
    profile: Pick<UserProfile, 'firstName' | 'lastName' | 'avatarUrl' | 'bio' | 'province' | 'whatsapp'>,
  ): number {
    let pct = 0
    if (user.emailVerified) pct += 15
    if (profile.firstName && profile.lastName) pct += 15
    if (profile.avatarUrl) pct += 15
    if (profile.bio) pct += 10
    if (user.phoneVerified) pct += 10
    if (profile.province) pct += 10
    if (profile.whatsapp) pct += 5
    if (user.kycLevel >= 2) pct += 20
    return Math.min(100, pct)
  }
}
