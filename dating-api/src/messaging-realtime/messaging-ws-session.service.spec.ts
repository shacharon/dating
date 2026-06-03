import { MessagingWsSessionService } from './messaging-ws-session.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('MessagingWsSessionService', () => {
  const prisma = {
    userSession: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: MessagingWsSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagingWsSessionService(prisma);
  });

  it('returns false when session id is empty', async () => {
    await expect(service.isSessionActive('  ')).resolves.toBe(false);
    expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
  });

  it('returns false when session row is missing', async () => {
    (prisma.userSession.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.isSessionActive('sess_1')).resolves.toBe(false);
  });

  it('returns false when session is revoked', async () => {
    (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
      revokedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });
    await expect(service.isSessionActive('sess_1')).resolves.toBe(false);
  });

  it('returns false when session is expired', async () => {
    (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    await expect(service.isSessionActive('sess_1')).resolves.toBe(false);
  });

  it('returns true for active session', async () => {
    (prisma.userSession.findUnique as jest.Mock).mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
    });
    await expect(service.isSessionActive('sess_1')).resolves.toBe(true);
  });
});
