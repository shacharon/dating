import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2Client } from 'google-auth-library';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let verifySpy: jest.SpyInstance;

  const cfg = {
    googleClientIds: ['test-client-id.apps.googleusercontent.com'],
    googleClientId: 'test-client-id.apps.googleusercontent.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        { provide: AuthSessionConfigService, useValue: cfg },
      ],
    }).compile();
    service = module.get(GoogleAuthService);
  });

  afterEach(() => {
    verifySpy?.mockRestore();
  });

  it('verifyIdToken returns normalized GoogleIdentity', async () => {
    verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: '  sub-1  ',
        email: '  User@Example.COM  ',
        email_verified: true,
        name: '  Pat  ',
        picture: '  https://pic/x  ',
      }),
    } as never);

    const out = await service.verifyIdToken('  raw.jwt.here  ');

    expect(out).toEqual({
      googleId: 'sub-1',
      email: 'user@example.com',
      displayName: 'Pat',
      avatarUrl: 'https://pic/x',
    });
    expect(verifySpy).toHaveBeenCalledWith({
      idToken: 'raw.jwt.here',
      audience: cfg.googleClientIds,
    });
  });

  it('maps empty name/picture to null', async () => {
    verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 's',
        email: 'a@b.co',
        email_verified: true,
        name: '   ',
        picture: undefined,
      }),
    } as never);

    const out = await service.verifyIdToken('token');
    expect(out.displayName).toBeNull();
    expect(out.avatarUrl).toBeNull();
  });

  it('rejects missing id_token', async () => {
    await expect(service.verifyIdToken('')).rejects.toMatchObject({
      response: { statusCode: 401 },
    });
    await expect(service.verifyIdToken(undefined)).rejects.toMatchObject({
      response: { statusCode: 401 },
    });
  });

  it('rejects missing Google client IDs', async () => {
    const mod = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        {
          provide: AuthSessionConfigService,
          useValue: { googleClientIds: [], googleClientId: undefined },
        },
      ],
    }).compile();
    const bare = mod.get(GoogleAuthService);
    await expect(bare.verifyIdToken('x')).rejects.toMatchObject({
      response: { statusCode: 500 },
    });
  });

  it('rejects when verifyIdToken throws', async () => {
    verifySpy = jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockRejectedValue(new Error('bad sig'));

    await expect(service.verifyIdToken('tok')).rejects.toMatchObject({
      response: { statusCode: 401 },
    });
  });

  it('rejects missing sub or email in payload', async () => {
    verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: '',
        email: 'a@b.co',
        email_verified: true,
      }),
    } as never);

    await expect(service.verifyIdToken('tok')).rejects.toMatchObject({
      response: { statusCode: 401 },
    });
  });

  it('rejects missing or blank email in payload', async () => {
    verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'valid-sub',
        email: '   ',
        email_verified: true,
      }),
    } as never);

    await expect(service.verifyIdToken('tok')).rejects.toMatchObject({
      response: { statusCode: 401 },
    });

    verifySpy.mockRestore();
    verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 'valid-sub',
        email_verified: true,
      }),
    } as never);

    await expect(service.verifyIdToken('tok2')).rejects.toMatchObject({
      response: { statusCode: 401 },
    });
  });

  it('rejects unverified email', async () => {
    verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        sub: 's',
        email: 'a@b.co',
        email_verified: false,
      }),
    } as never);

    await expect(service.verifyIdToken('tok')).rejects.toMatchObject({
      response: { statusCode: 401 },
    });
  });
});
