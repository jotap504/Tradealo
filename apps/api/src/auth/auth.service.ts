import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE_TOKEN } from '../database/database.module';
import { ConfigService } from '../config/config.service';
import * as schema from '../database/schema';
import { TOKEN } from '../common/constants/token.constants';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { GoogleProfile } from './strategies/google.strategy';

type DB = NodePgDatabase<typeof schema>;

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_TOKEN_EXPIRES_IN = 900; // seconds
const REFERRAL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSummary {
  id: string;
  email: string;
  username?: string;
  role: string;
  kycLevel: number;
  accountType: string;
  referralCode: string | null;
  createdAt: Date;
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
      .limit(1);

    if (existing) throw new ConflictException('EMAIL_ALREADY_EXISTS');

    const [existingUsername] = await this.db
      .select({ id: schema.userProfiles.userId })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.username, dto.username))
      .limit(1);

    if (existingUsername)
      throw new ConflictException('USERNAME_ALREADY_EXISTS');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const referralCode = this.generateReferralCode();
    const rewardTokens = await this.configService.getNumber(
      TOKEN.CONFIG_KEYS.REWARD_REGISTRATION,
      5,
    );

    let referredById: string | undefined;
    if (dto.referralCode) {
      const [referrer] = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.referralCode, dto.referralCode))
        .limit(1);
      referredById = referrer?.id;
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
          accountType: schema.users.accountType,
          referralCode: schema.users.referralCode,
          createdAt: schema.users.createdAt,
        });

      await tx.insert(schema.userProfiles).values({
        userId: inserted.id,
        username: dto.username,
      });

      await tx.insert(schema.wallets).values({
        userId: inserted.id,
        balance: rewardTokens,
        lifetimeEarned: rewardTokens,
      });

      if (rewardTokens > 0) {
        await tx.insert(schema.creditTransactions).values({
          userId: inserted.id,
          amount: rewardTokens,
          balanceAfter: rewardTokens,
          reason: 'registration_bonus',
        });
      }

      return { ...inserted, username: dto.username };
    });

    const tokens = await this.createTokenPair(
      user.id,
      user.email,
      user.role,
      user.kycLevel,
      user.accountType,
    );
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        kycLevel: user.kycLevel,
        accountType: user.accountType,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    };
  }

  async login(dto: LoginDto): Promise<TokenPair & { user: UserSummary }> {
    const rows = await this.db
      .select({
        user: schema.users,
        profile: schema.userProfiles,
      })
      .from(schema.users)
      .leftJoin(
        schema.userProfiles,
        eq(schema.userProfiles.userId, schema.users.id),
      )
      .where(eq(schema.users.email, dto.email))
      .limit(1);

    const row = rows[0];
    if (!row) throw new UnauthorizedException('USER_NOT_FOUND_IN_DB');

    const { user, profile } = row;

    if (!user.passwordHash) throw new UnauthorizedException('PASSWORD_LOGIN_NOT_AVAILABLE');
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('PASSWORD_MISMATCH');

    if (user.status !== 'active') {
      if (
        user.status === 'suspended' &&
        user.suspendedUntil &&
        user.suspendedUntil < new Date()
      ) {
        await this.db
          .update(schema.users)
          .set({ status: 'active', suspendedUntil: null })
          .where(eq(schema.users.id, user.id));
      } else {
        throw new ForbiddenException('ACCOUNT_SUSPENDED');
      }
    }

    await this.db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, user.id));

    const tokens = await this.createTokenPair(
      user.id,
      user.email,
      user.role,
      user.kycLevel,
      user.accountType,
    );
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || undefined,
        role: user.role,
        kycLevel: user.kycLevel,
        accountType: user.accountType,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    };
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawToken);

    const [stored] = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored) throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    if (stored.revokedAt)
      throw new UnauthorizedException('REFRESH_TOKEN_REVOKED');
    if (stored.expiresAt < new Date())
      throw new UnauthorizedException('REFRESH_TOKEN_EXPIRED');

    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
        kycLevel: schema.users.kycLevel,
        accountType: schema.users.accountType,
        status: schema.users.status,
      })
      .from(schema.users)
      .where(eq(schema.users.id, stored.userId))
      .limit(1);

    if (!user || user.status !== 'active')
      throw new ForbiddenException('ACCOUNT_SUSPENDED');

    // Rotate: revoke old token, issue new pair
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.tokenHash, tokenHash));

    return this.createTokenPair(
      user.id,
      user.email,
      user.role,
      user.kycLevel,
      user.accountType,
    );
  }

  async logout(userId: string, rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, tokenHash),
          eq(schema.refreshTokens.userId, userId),
        ),
      );
  }

  async getMe(userId: string): Promise<UserSummary> {
    const rows = await this.db
      .select({
        user: schema.users,
        profile: schema.userProfiles,
      })
      .from(schema.users)
      .leftJoin(
        schema.userProfiles,
        eq(schema.userProfiles.userId, schema.users.id),
      )
      .where(eq(schema.users.id, userId))
      .limit(1);

    const row = rows[0];
    if (!row) throw new NotFoundException('USER_NOT_FOUND');

    const { user, profile } = row;

    return {
      id: user.id,
      email: user.email,
      username: profile?.username || undefined,
      role: user.role,
      kycLevel: user.kycLevel,
      accountType: user.accountType,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
    };
  }

  async findOrCreateGoogleUser(
    profile: GoogleProfile,
  ): Promise<TokenPair & { user: UserSummary }> {
    // 1. Find by googleId
    const [byGoogleId] = await this.db
      .select({ user: schema.users, profile: schema.userProfiles })
      .from(schema.users)
      .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
      .where(eq(schema.users.googleId, profile.googleId))
      .limit(1);

    if (byGoogleId) {
      await this.db
        .update(schema.users)
        .set({ lastLoginAt: new Date() })
        .where(eq(schema.users.id, byGoogleId.user.id));
      const tokens = await this.createTokenPair(
        byGoogleId.user.id,
        byGoogleId.user.email,
        byGoogleId.user.role,
        byGoogleId.user.kycLevel,
        byGoogleId.user.accountType,
      );
      return {
        ...tokens,
        user: {
          id: byGoogleId.user.id,
          email: byGoogleId.user.email,
          username: byGoogleId.profile?.username ?? undefined,
          role: byGoogleId.user.role,
          kycLevel: byGoogleId.user.kycLevel,
          accountType: byGoogleId.user.accountType,
          referralCode: byGoogleId.user.referralCode,
          createdAt: byGoogleId.user.createdAt,
        },
      };
    }

    // 2. Find by email (existing email/password account) → link googleId
    const [byEmail] = await this.db
      .select({ user: schema.users, profile: schema.userProfiles })
      .from(schema.users)
      .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
      .where(eq(schema.users.email, profile.email))
      .limit(1);

    if (byEmail) {
      await this.db
        .update(schema.users)
        .set({ googleId: profile.googleId, lastLoginAt: new Date() })
        .where(eq(schema.users.id, byEmail.user.id));
      const tokens = await this.createTokenPair(
        byEmail.user.id,
        byEmail.user.email,
        byEmail.user.role,
        byEmail.user.kycLevel,
        byEmail.user.accountType,
      );
      return {
        ...tokens,
        user: {
          id: byEmail.user.id,
          email: byEmail.user.email,
          username: byEmail.profile?.username ?? undefined,
          role: byEmail.user.role,
          kycLevel: byEmail.user.kycLevel,
          accountType: byEmail.user.accountType,
          referralCode: byEmail.user.referralCode,
          createdAt: byEmail.user.createdAt,
        },
      };
    }

    // 3. New user — create account
    const username = await this.generateUniqueUsername(profile.displayName);
    const referralCode = this.generateReferralCode();
    const rewardTokens = await this.configService.getNumber(
      TOKEN.CONFIG_KEYS.REWARD_REGISTRATION,
      5,
    );

    const newUser = await this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.users)
        .values({
          email: profile.email,
          googleId: profile.googleId,
          referralCode,
        })
        .returning({
          id: schema.users.id,
          email: schema.users.email,
          role: schema.users.role,
          kycLevel: schema.users.kycLevel,
          accountType: schema.users.accountType,
          referralCode: schema.users.referralCode,
          createdAt: schema.users.createdAt,
        });

      await tx.insert(schema.userProfiles).values({
        userId: inserted.id,
        username,
        avatarUrl: profile.avatarUrl,
      });

      await tx.insert(schema.wallets).values({
        userId: inserted.id,
        balance: rewardTokens,
        lifetimeEarned: rewardTokens,
      });

      if (rewardTokens > 0) {
        await tx.insert(schema.creditTransactions).values({
          userId: inserted.id,
          amount: rewardTokens,
          balanceAfter: rewardTokens,
          reason: 'registration_bonus',
        });
      }

      return { ...inserted, username };
    });

    const tokens = await this.createTokenPair(
      newUser.id,
      newUser.email,
      newUser.role,
      newUser.kycLevel,
      newUser.accountType,
    );
    return {
      ...tokens,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        kycLevel: newUser.kycLevel,
        accountType: newUser.accountType,
        referralCode: newUser.referralCode,
        createdAt: newUser.createdAt,
      },
    };
  }

  private async generateUniqueUsername(displayName: string): Promise<string> {
    const base = (displayName || 'usuario')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase()
      .slice(0, 25) || 'usuario';

    const [existing] = await this.db
      .select({ id: schema.userProfiles.userId })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.username, base))
      .limit(1);

    if (!existing) return base;

    for (let i = 1; i <= 99; i++) {
      const candidate = `${base}_${i}`;
      const [taken] = await this.db
        .select({ id: schema.userProfiles.userId })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.username, candidate))
        .limit(1);
      if (!taken) return candidate;
    }

    return `${base}_${randomBytes(3).toString('hex')}`;
  }

  private async createTokenPair(
    userId: string,
    email: string,
    role: string,
    kycLevel: number,
    accountType: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      kycLevel,
      accountType,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'changeme_dev_only',
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.db
      .insert(schema.refreshTokens)
      .values({ userId, tokenHash, expiresAt });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateReferralCode(): string {
    return Array.from(randomBytes(12))
      .map((b) => REFERRAL_CHARS[b % REFERRAL_CHARS.length])
      .join('');
  }
}
