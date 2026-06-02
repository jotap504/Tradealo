import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { DRIZZLE_TOKEN } from './database/database.module';
import { REDIS_TOKEN } from './redis/redis.module';

describe('AppController', () => {
  let appController: AppController;
  const mockDb = { execute: jest.fn() };
  const mockRedis = { status: 'ready' };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: DRIZZLE_TOKEN, useValue: mockDb },
        { provide: REDIS_TOKEN, useValue: mockRedis },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return health status ok', () => {
      const res = appController.health();
      expect(res.status).toBe('ok');
      expect(res.timestamp).toBeDefined();
    });
  });
});

