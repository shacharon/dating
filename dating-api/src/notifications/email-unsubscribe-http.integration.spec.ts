/**
 * Email unsubscribe HTTP integration (public GET, no auth cookie).
 * Run: `npx jest email-unsubscribe-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailUnsubscribeController } from './email-unsubscribe.controller';
import { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service';

describe('email unsubscribe HTTP (integration)', () => {
  let app: INestApplication<App>;
  const prismaMock = {
    user: {
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const configStub = {
    unsubscribeSecret: 'integration-test-unsubscribe-secret',
    appPublicUrl: 'http://localhost:3000',
  } as EmailNotificationConfigService;

  const obsMock = {
    trace: jest.fn(),
    error: jest.fn(),
  };

  let tokenService: EmailUnsubscribeTokenService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EmailUnsubscribeController],
      providers: [
        EmailUnsubscribeTokenService,
        {
          provide: EmailNotificationConfigService,
          useValue: configStub,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: StructuredObservabilityService,
          useValue: obsMock,
        },
      ],
    }).compile();

    tokenService = moduleFixture.get(EmailUnsubscribeTokenService);
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET unsubscribe with valid token returns HTML and disables notifications', async () => {
    const token = tokenService.sign('user_unsub_1');

    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/email/unsubscribe')
      .query({ token })
      .expect(200);

    expect(res.text).toContain('unsubscribed from Piza email notifications');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user_unsub_1' },
      data: { emailNotificationsEnabled: false },
    });
  });

  it('GET unsubscribe with invalid token returns 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications/email/unsubscribe')
      .query({ token: 'not-a-valid-token' })
      .expect(400);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
