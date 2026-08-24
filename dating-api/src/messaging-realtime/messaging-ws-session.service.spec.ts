import type { TokenService } from '../auth/token.service';
import type { ISessionConnectionReadRepository } from '../session/repositories/session-connection-read.repository';
import { MessagingWsSessionService } from './messaging-ws-session.service';

describe('MessagingWsSessionService', () => {
  const connectionRead: jest.Mocked<ISessionConnectionReadRepository> = {
    isSessionRowActive: jest.fn(),
    isUserActiveForConnection: jest.fn(),
  };

  const tokens = {
    verifyAccessToken: jest.fn(),
  } as unknown as TokenService;

  let service: MessagingWsSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagingWsSessionService(connectionRead, tokens);
  });

  describe('isSessionActive', () => {
    it('delegates to connection read port', async () => {
      connectionRead.isSessionRowActive.mockResolvedValue(true);
      await expect(service.isSessionActive('sess_1')).resolves.toBe(true);
      expect(connectionRead.isSessionRowActive).toHaveBeenCalledWith('sess_1');
    });
  });

  describe('isConnectionAllowed', () => {
    it('returns false when session row is inactive', async () => {
      connectionRead.isSessionRowActive.mockResolvedValue(false);
      await expect(
        service.isConnectionAllowed('sess_1', 'user_1'),
      ).resolves.toBe(false);
      expect(connectionRead.isUserActiveForConnection).not.toHaveBeenCalled();
    });

    it('returns false when userId is empty', async () => {
      connectionRead.isSessionRowActive.mockResolvedValue(true);
      await expect(service.isConnectionAllowed('sess_1', '  ')).resolves.toBe(
        false,
      );
      expect(connectionRead.isUserActiveForConnection).not.toHaveBeenCalled();
    });

    it('returns false when user is not active for connection', async () => {
      connectionRead.isSessionRowActive.mockResolvedValue(true);
      connectionRead.isUserActiveForConnection.mockResolvedValue(false);
      await expect(
        service.isConnectionAllowed('sess_1', 'user_1'),
      ).resolves.toBe(false);
      expect(connectionRead.isUserActiveForConnection).toHaveBeenCalledWith(
        'user_1',
      );
    });

    it('returns true when session and user are allowed', async () => {
      connectionRead.isSessionRowActive.mockResolvedValue(true);
      connectionRead.isUserActiveForConnection.mockResolvedValue(true);
      await expect(
        service.isConnectionAllowed('sess_1', 'user_1'),
      ).resolves.toBe(true);
    });
  });

  describe('isBearerConnectionAllowed', () => {
    it('returns false when token verify fails', async () => {
      (tokens.verifyAccessToken as jest.Mock).mockResolvedValue(null);
      await expect(
        service.isBearerConnectionAllowed('user_1', 'bad-token'),
      ).resolves.toBe(false);
      expect(connectionRead.isUserActiveForConnection).not.toHaveBeenCalled();
    });

    it('returns false when token userId mismatches', async () => {
      (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
        userId: 'other_user',
      });
      await expect(
        service.isBearerConnectionAllowed('user_1', 'token'),
      ).resolves.toBe(false);
    });

    it('returns false when user is not active for connection', async () => {
      (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
        userId: 'user_1',
      });
      connectionRead.isUserActiveForConnection.mockResolvedValue(false);
      await expect(
        service.isBearerConnectionAllowed('user_1', 'token'),
      ).resolves.toBe(false);
    });

    it('returns true when token and user are valid', async () => {
      (tokens.verifyAccessToken as jest.Mock).mockResolvedValue({
        userId: 'user_1',
      });
      connectionRead.isUserActiveForConnection.mockResolvedValue(true);
      await expect(
        service.isBearerConnectionAllowed('user_1', 'token'),
      ).resolves.toBe(true);
    });
  });
});
