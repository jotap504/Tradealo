import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';

export interface AdminPreAuthPayload {
  sub: string;
  email: string;
  role: string;
  totpEnabled: boolean;
  preAuth: true;
}

export interface AdminSessionPayload {
  sub: string;
  email: string;
  role: string;
  isAdminSession: true;
}

type DB = NodePgDatabase<typeof schema>;

const PREAUTH_TTL_SECONDS = 300; // 5 minutes
const TOTP_WINDOW = 1; // ±1 step tolerance (±30s)

@Injectable()
export class AdminAuthService {
  private readonly sessionTtlSeconds: number;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DB,
    private readonly jwtService: JwtService,
  ) {
    this.sessionTtlSeconds = Number(process.env.ADMIN_SESSION_TIMEOUT ?? 7200);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ preAuthToken: string }> {
    const [admin] = await this.db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, email))
      .limit(1);

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('INVALID_ADMIN_CREDENTIALS');
    }

    const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatch)
      throw new UnauthorizedException('INVALID_ADMIN_CREDENTIALS');

    const payload: AdminPreAuthPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      totpEnabled: admin.totpEnabled,
      preAuth: true,
    };

    const preAuthToken = this.jwtService.sign(payload, {
      expiresIn: PREAUTH_TTL_SECONDS,
    });

    return { preAuthToken };
  }

  async setupTotp(
    adminId: string,
  ): Promise<{ otpauthUrl: string; secret: string }> {
    const [admin] = await this.db
      .select({
        totpEnabled: schema.adminUsers.totpEnabled,
        email: schema.adminUsers.email,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, adminId))
      .limit(1);

    if (!admin) throw new UnauthorizedException('ADMIN_NOT_FOUND');
    if (admin.totpEnabled) throw new ConflictException('TOTP_ALREADY_ENABLED');

    const secret = speakeasy.generateSecret({
      name: `Trocalia Admin (${admin.email})`,
      length: 20,
    });

    await this.db
      .update(schema.adminUsers)
      .set({ totpSecret: secret.base32 })
      .where(eq(schema.adminUsers.id, adminId));

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url!,
    };
  }

  async confirmTotp(adminId: string, code: string): Promise<void> {
    const [admin] = await this.db
      .select({
        totpSecret: schema.adminUsers.totpSecret,
        totpEnabled: schema.adminUsers.totpEnabled,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, adminId))
      .limit(1);

    if (!admin) throw new UnauthorizedException('ADMIN_NOT_FOUND');
    if (admin.totpEnabled) throw new ConflictException('TOTP_ALREADY_ENABLED');
    if (!admin.totpSecret) throw new BadRequestException('TOTP_SETUP_REQUIRED');

    const valid = speakeasy.totp.verify({
      secret: admin.totpSecret,
      encoding: 'base32',
      token: code,
      window: TOTP_WINDOW,
    });

    if (!valid) throw new UnauthorizedException('INVALID_TOTP_CODE');

    await this.db
      .update(schema.adminUsers)
      .set({ totpEnabled: true })
      .where(eq(schema.adminUsers.id, adminId));
  }

  async verifyTotp(
    adminId: string,
    code: string,
  ): Promise<{ adminToken: string; expiresIn: number }> {
    const [admin] = await this.db
      .select({
        totpSecret: schema.adminUsers.totpSecret,
        totpEnabled: schema.adminUsers.totpEnabled,
        email: schema.adminUsers.email,
        role: schema.adminUsers.role,
      })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, adminId))
      .limit(1);

    if (!admin) throw new UnauthorizedException('ADMIN_NOT_FOUND');
    if (!admin.totpEnabled || !admin.totpSecret)
      throw new BadRequestException('TOTP_NOT_ENABLED');

    const valid = speakeasy.totp.verify({
      secret: admin.totpSecret,
      encoding: 'base32',
      token: code,
      window: TOTP_WINDOW,
    });

    if (!valid) throw new UnauthorizedException('INVALID_TOTP_CODE');

    await this.db
      .update(schema.adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.adminUsers.id, adminId));

    const payload: AdminSessionPayload = {
      sub: adminId,
      email: admin.email,
      role: admin.role,
      isAdminSession: true,
    };

    const adminToken = this.jwtService.sign(payload, {
      expiresIn: this.sessionTtlSeconds,
    });

    return { adminToken, expiresIn: this.sessionTtlSeconds };
  }
}
