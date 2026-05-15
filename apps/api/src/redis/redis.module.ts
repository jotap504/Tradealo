import { Module, Global, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_TOKEN = Symbol('REDIS_TOKEN');

const logger = new Logger('RedisModule');

function createRedisClient(): Redis | { status: string; on: () => void } {
  const host = process.env.REDIS_HOST;
  if (!host) {
    logger.warn('REDIS_HOST not set — rate limiting disabled');
    return { status: 'disabled', on: () => undefined };
  }

  const client = new Redis({
    host,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: 0,
    lazyConnect: true,
    commandTimeout: 3000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
  });

  client.connect().catch(() => {
    logger.warn('Redis connection failed — rate limiting disabled');
  });

  client.on('error', (err: Error) =>
    logger.warn(`Redis error: ${err.message}`),
  );

  return client;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      useFactory: createRedisClient,
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
