import { MatchNarrativeCacheService } from './match-narrative-cache.service';
import type { IMatchNarrativeCacheRepository } from '../../me-profile/repositories/match-narrative-cache.repository';

describe('MatchNarrativeCacheService', () => {
  const find = jest.fn();
  const upsert = jest.fn();
  const cache: IMatchNarrativeCacheRepository = { find, upsert };
  const service = new MatchNarrativeCacheService(cache);

  const key = {
    viewerProfileId: 'vp',
    candidateProfileId: 'cp',
    viewerEvaluationId: 've',
    candidateEvaluationId: 'ce',
    promptVersion: 'v1',
  };

  beforeEach(() => {
    find.mockReset();
    upsert.mockReset();
  });

  it('find delegates to narrative cache repository', async () => {
    find.mockResolvedValue('cached');
    await expect(service.find(key)).resolves.toBe('cached');
    expect(find).toHaveBeenCalledWith(key);
  });

  it('upsert delegates to narrative cache repository', async () => {
    upsert.mockResolvedValue(undefined);
    await service.upsert({ ...key, narrative: 'llm text', model: 'gpt-test' });
    expect(upsert).toHaveBeenCalledWith({
      ...key,
      narrative: 'llm text',
      model: 'gpt-test',
    });
  });
});
