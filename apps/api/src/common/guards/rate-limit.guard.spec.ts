import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { REDIS_TOKEN } from '../../redis/redis.module';

const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
};

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

function makeContext(ip = '1.2.3.4', user?: { sub: string }): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ ip, user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: REDIS_TOKEN, useValue: mockRedis },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  it('passes when no rate limit metadata is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(mockRedis.incr).not.toHaveBeenCalled();
  });

  it('allows first request and sets TTL', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ ttl: 900, limit: 5 });
    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 900);
  });

  it('allows requests under the limit', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ ttl: 900, limit: 5 });
    mockRedis.incr.mockResolvedValue(3);
    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it('throws 429 when limit is exceeded', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ ttl: 900, limit: 5 });
    mockRedis.incr.mockResolvedValue(6);
    await expect(guard.canActivate(makeContext())).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('uses user ID as key when keyBy=user and user is authenticated', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      ttl: 3600,
      limit: 20,
      keyBy: 'user',
    });
    await guard.canActivate(makeContext('1.2.3.4', { sub: 'user-001' }));
    expect(mockRedis.incr).toHaveBeenCalledWith(
      expect.stringContaining('u:user-001'),
    );
  });

  it('falls back to IP when keyBy=user but user is not authenticated', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      ttl: 3600,
      limit: 20,
      keyBy: 'user',
    });
    await guard.canActivate(makeContext('1.2.3.4', undefined));
    expect(mockRedis.incr).toHaveBeenCalledWith(
      expect.stringContaining('ip:1.2.3.4'),
    );
  });

  it('skips expire on subsequent requests (count > 1)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ ttl: 900, limit: 5 });
    mockRedis.incr.mockResolvedValue(2);
    await guard.canActivate(makeContext());
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });
});
