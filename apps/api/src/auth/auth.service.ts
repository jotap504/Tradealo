import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createHash, randomBytes } from 'crypto'
import * as bcrypt from 'bcrypt'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { ConfigService } from '../config/config.service'
import * as schema from '../database/schema'
import { TOKEN } from '../common/constants/token.constants'
import type { JwtPayload } from '../common/decorators/current-user.decorator'
import type { RegisterDto } from './dto/register.dto'
import type { LoginDto } from './dto/login.dto'

type DB = NodePgDatabase<typeof schema>

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const ACCESS_TOKEN_EXPIRES_IN = 900 // seconds
const REFERRAL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface UserSummary {
  id: string
  email: string
  role: string
  kycLevel: number
  referralCode: string | null
  createdAt: Date
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair & { user: UserSummary }> {
    const [existing] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, dto.email))
      .limit(1)

    if (existing) throw new ConflictException('EMAIL_ALREADY_EXISTS')

    const [existingUsername] = await this.db
      .select({ id: schema.userProfiles.userId })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.username, dto.username))
      .limit(1)

    if (existingUsername) throw new ConflictException('USERNAME_ALREADY_EXISTS')

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
    const referralCode = this.generateReferralCode()
    const rewardTokens = await this.configService.getNumber(
      TOKEN.CONFIG_KEYS.REWARD_REGISTRATION,
      5,
    )

    let referredById: string | undefined
    if (dto.referralCode) {
      const [referrer] = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.referralCode, dto.referralCode))
        .limit(1)
      referredById = referrer?.id
    }

    const user = await this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.users)
        .values({
          email: dto.email,
          passwordHash,
          referralCode,
          referredBy: referredById,
        })
        .returning({
          id: schema.users.id,
          email: schema.users.email,
          role: schema.users.role,
          kycLevel: schema.users.kycLevel,
          referralCode: schema.users.referralCode,
          createdAt: schema.users.createdAt,
        })

      await tx.insert(schema.userProfiles).values({
        userId: inserted.id,
        username: dto.username,
      })

      await tx.insert(schema.wallets).values({
        userId: inserted.id,
        balance: rewardTokens,
        lifetimeEarned: rewardTokens,
      })

      if (rewardTokens > 0) {
        await tx.insert(schema.creditTransactions).values({
          userId: inserted.id,
          amount: rewardTokens,
          balanceAfter: rewardTokens,
          reason: 'registration_bonus',
        })
      }

      return inserted
    })

    const tokens = await this.createTokenPair(user.id, user.email, user.role, user.kycLevel)
    return { ...tokens, user }
  }

  async login(dto: LoginDto): Promise<TokenPair & { user: UserSummary }> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, dto.email))
      .limit(1)

    if (!user) throw new UnauthorizedException('INVALID_CREDENTIALS')

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordValid) throw new UnauthorizedException('INVALID_CREDENTIALS')

    if (user.status !== 'active') throw new ForbiddenException('ACCOUNT_SUSPENDED')

    await this.db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, user.id))

    const tokens = await this.createTokenPair(user.id, user.email, user.role, user.kycLevel)
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        kycLevel: user.kycLevel,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    }
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawToken)

    const [stored] = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, tokenHash))
      .limit(1)

    if (!stored) throw new UnauthorizedException('INVALID_REFRESH_TOKEN')
    if (stored.revokedAt) throw new UnauthorizedException('REFRESH_TOKEN_REVOKED')
    if (stored.expiresAt < new Date()) throw new UnauthorizedException('REFRESH_TOKEN_EXPIRED')

    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
        kycLevel: schema.users.kycLevel,
        status: schema.users.status,
      })
      .from(schema.users)
      .where(eq(schema.users.id, stored.userId))
      .limit(1)

    if (!user || user.status !== 'active') throw new ForbiddenException('ACCOUNT_SUSPENDED')

    // Rotate: revoke old token, issue new pair
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.tokenHash, tokenHash))

    return this.createTokenPair(user.id, user.email, user.role, user.kycLevel)
  }

  async logout(userId: string, rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken)
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, tokenHash),
          eq(schema.refreshTokens.userId, userId),
        ),
      )
  }

  async getMe(userId: string): Promise<UserSummary & { profile: typeof schema.userProfiles.$inferSelect | null }> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
        kycLevel: schema.users.kycLevel,
        referralCode: schema.users.referralCode,
        createdAt: schema.users.createdAt,
        profile: schema.userProfiles,
      })
      .from(schema.users)
      .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
      .where(eq(schema.users.id, userId))
      .limit(1)

    const row = rows[0]
    if (!row) throw new NotFoundException('USER_NOT_FOUND')
    return row
  }

  private async createTokenPair(
    userId: string,
    email: string,
    role: string,
    kycLevel: number,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role, kycLevel }

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'changeme_dev_only',
      expiresIn: ACCESS_TOKEN_TTL,
    })

    const rawRefresh = randomBytes(48).toString('hex')
    const tokenHash = this.hashToken(rawRefresh)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

    await this.db.insert(schema.refreshTokens).values({ userId, tokenHash, expiresAt })

    return { accessToken, refreshToken: rawRefresh, expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private generateReferralCode(): string {
    return Array.from(randomBytes(12))
      .map((b) => REFERRAL_CHARS[b % REFERRAL_CHARS.length])
      .join('')
  }
}
