import { ConversationStarterCacheService } from './conversation-starter-cache.service';

describe('ConversationStarterCacheService', () => {
  const key = {
    viewerProfileId: 'v',
    candidateProfileId: 'c',
    viewerEvaluationId: 'ev',
    candidateEvaluationId: 'ec',
    promptVersion: 'v1',
  };

  it('find returns opener when present', async () => {
    const findUnique = jest.fn().mockResolvedValue({ opener: '  Hi trail?  ' });
    const svc = new ConversationStarterCacheService({
      conversationStarterCache: { findUnique, upsert: jest.fn() },
    } as never);
    await expect(svc.find(key)).resolves.toEqual({ opener: 'Hi trail?' });
  });

  it('find returns null when empty', async () => {
    const findUnique = jest.fn().mockResolvedValue({ opener: '   ' });
    const svc = new ConversationStarterCacheService({
      conversationStarterCache: { findUnique, upsert: jest.fn() },
    } as never);
    await expect(svc.find(key)).resolves.toBeNull();
  });

  it('upsert writes opener', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const svc = new ConversationStarterCacheService({
      conversationStarterCache: { findUnique: jest.fn(), upsert },
    } as never);
    await svc.upsert({ ...key, opener: 'Opener text?' });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ opener: 'Opener text?' }),
      }),
    );
  });
});
