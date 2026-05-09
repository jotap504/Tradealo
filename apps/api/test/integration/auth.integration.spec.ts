import * as request from 'supertest';
import {
  HttpStatus,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DatabaseModule } from '../../src/database/database.module';
import { RedisModule } from '../../src/redis/redis.module';
import { ConfigModule } from '../../src/config/config.module';
import { AuthModule } from '../../src/auth/auth.module';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';

// Set env vars before modules initialize
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://tradealo:password@localhost:5433/tradealo_test';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6380';
process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';

// RateLimitGuard excluded intentionally — we test auth logic, not rate limiting
@Module({
  imports: [DatabaseModule, RedisModule, ConfigModule, AuthModule],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
class AuthTestModule {}

async function buildApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthTestModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  await app.init();
  return app;
}

// ─── POST /auth/register ──────────────────────────────────────────────────

describe('POST /api/v1/auth/register (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('201 con datos válidos', async () => {
    const email = `register-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'ValidPass123!' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
      });
  });

  it('409 con email duplicado', async () => {
    const email = `dup-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'ValidPass123!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'ValidPass123!' })
      .expect(409);
  });

  it('422 con contraseña sin mayúscula', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `test-${Date.now()}@test.com`, password: 'nouppercase1!' })
      .expect(422);
  });

  it('422 con contraseña sin número', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `test-${Date.now()}@test.com`, password: 'NoNumbers!' })
      .expect(422);
  });

  it('422 con email inválido', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'ValidPass123!' })
      .expect(422);
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────

describe('POST /api/v1/auth/login (integration)', () => {
  let app: INestApplication;
  const testEmail = `login-${Date.now()}@test.com`;
  const testPassword = 'LoginPass123!';

  beforeAll(async () => {
    app = await buildApp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword });
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('200 con credenciales válidas', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body).toHaveProperty('expiresIn');
      });
  });

  it('401 con contraseña incorrecta', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'WrongPass123!' })
      .expect(401);
  });

  it('401 con email inexistente', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'ValidPass123!' })
      .expect(401);
  });
});
