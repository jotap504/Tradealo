import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type Redis from 'ioredis';
import { AppModule } from './app.module';
import { REDIS_TOKEN } from './redis/redis.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '8mb' });

  const redisClient = app.get<Redis>(REDIS_TOKEN);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:', '*.r2.dev', '*.cloudflare.com'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'fonts.gstatic.com'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        sendCommand: async (...args: string[]) => {
          if (redisClient.status !== 'ready') return 0;
          try {
            return await (redisClient.call(
              args[0],
              ...args.slice(1),
            ) as Promise<number>);
          } catch {
            return 0;
          }
        },
      }),
      skip: () => redisClient.status !== 'ready',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  app.setGlobalPrefix('api/v1', { exclude: ['/health'] });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}

bootstrap();
