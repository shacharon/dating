/**
 * HTTP: POST/DELETE /api/v1/me/devices
 * Run: `npx jest --runInBand --testPathPatterns=device-tokens-http.integration`
 */
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserStatus } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { DeviceTokensController } from './device-tokens.controller';
import {
  DEVICE_TOKEN_REPOSITORY,
  type IDeviceTokenRepository,
} from './repositories/device-token.repository';

@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      authUser?: {
        id: string;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        status: UserStatus;
        emailNotificationsEnabled: boolean;
        inAppNotificationsEnabled: boolean;
      };
    }>();
    req.authUser = {
      id: 'user_devices_1',
      email: 'devices@example.com',
      displayName: 'Dev',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    };
    return true;
  }
}

describe('device tokens HTTP (integration)', () => {
  let app: INestApplication<App>;
  const repo: IDeviceTokenRepository = {
    upsert: jest.fn().mockResolvedValue(undefined),
    findByUserId: jest.fn(),
    deleteForUser: jest.fn().mockResolvedValue(1),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DeviceTokensController],
      providers: [
        { provide: DEVICE_TOKEN_REPOSITORY, useValue: repo },
        { provide: AuthGuard, useClass: TestAuthGuard },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(TestAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST registers device token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/me/devices')
      .send({ token: '  fcm-token-xyz  ', platform: 'android' })
      .expect(200);

    expect(res.body).toEqual({ ok: true });
    expect(repo.upsert).toHaveBeenCalledWith(
      'user_devices_1',
      'fcm-token-xyz',
      'android',
    );
  });

  it('POST rejects invalid platform', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/devices')
      .send({ token: 'tok', platform: 'windows' })
      .expect(400);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('POST rejects empty token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/devices')
      .send({ token: '   ', platform: 'android' })
      .expect(400);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('POST rejects unknown keys', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/devices')
      .send({ token: 'tok', platform: 'ios', extra: true })
      .expect(400);
  });

  it('DELETE unregisters owner-scoped token', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/me/devices')
      .send({ token: 'fcm-token-xyz' })
      .expect(200);

    expect(res.body).toEqual({ ok: true });
    expect(repo.deleteForUser).toHaveBeenCalledWith(
      'user_devices_1',
      'fcm-token-xyz',
    );
  });
});
