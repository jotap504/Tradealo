import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_TOKEN = Symbol('REDIS_TOKEN');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          password: process.env.REDIS_PASSWORD,
          db: 0,
          lazyConnect: false,
          retryStrategy: (times) => Math.min(times * 100, 3000),
          ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
        }),
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
