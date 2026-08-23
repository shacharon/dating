import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthSessionConfigService } from './auth-session-config.service';

describe('AuthSessionConfigService — Google OAuth', () => {
  let service: AuthSessionConfigService;

  const configMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSessionConfigService,
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();
    service = module.get(AuthSessionConfigService);
  });

  it('googleClientIds merges GOOGLE_CLIENT_IDS and GOOGLE_CLIENT_ID', () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'GOOGLE_CLIENT_IDS') {
        return 'android-id.apps.googleusercontent.com';
      }
      if (key === 'GOOGLE_CLIENT_ID') {
        return 'web-id.apps.googleusercontent.com';
      }
      return undefined;
    });

    expect(service.googleClientIds).toEqual([
      'android-id.apps.googleusercontent.com',
      'web-id.apps.googleusercontent.com',
    ]);
    expect(service.googleClientId).toBe('android-id.apps.googleusercontent.com');
  });

  it('googleClientId is undefined when no ids configured', () => {
    configMock.get.mockReturnValue(undefined);

    expect(service.googleClientIds).toEqual([]);
    expect(service.googleClientId).toBeUndefined();
  });
});
