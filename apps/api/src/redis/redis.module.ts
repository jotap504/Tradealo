import { Module, Global, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_TOKEN = Symbol('REDIS_TOKEN');

const logger = new Logger('RedisModule');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      useFactory: () => {
        const client = new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          password: process.env.REDIS_PASSWORD,
          db: 0,
          lazyConnect: false,
          commandTimeout: 5000,
          enableOfflineQueue: true,
          retryStrategy: (times) => Math.min(times * 200, 10000),
          ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
        });
        client.on('error', (err: Error) =>
          logger.warn(`Redis error: ${err.message}`),
        );
        return client;
      },
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
