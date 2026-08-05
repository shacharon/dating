import { MatchNarrativeCacheService } from './match-narrative-cache.service';
import { buildNarrativeTldr } from './match-narrative-tldr';

describe('MatchNarrativeCacheService', () => {
  const findUnique = jest.fn();
  const upsert = jest.fn();
  const update = jest.fn();
  const prisma = {
    matchNarrativeCache: { findUnique, upsert, update },
  };
  const service = new MatchNarrativeCacheService(prisma as never);

  const key = {
    viewerProfileId: 'vp',
    candidateProfileId: 'cp',
    viewerEvaluationId: 've',
    candidateEvaluationId: 'ce',
    promptVersion: 'v1',
  };

  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset();
    update.mockReset();
    update.mockResolvedValue({});
  });

  it('find returns narrative + tldr on hit', async () => {
    findUnique.mockResolvedValue({
      narrative: 'cached full.',
      narrativeTldr: 'cached full.',
    });
    await expect(service.find(key)).resolves.toEqual({
      narrative: 'cached full.',
      narrativeTldr: 'cached full.',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion:
          key,
      },
      select: { narrative: true, narrativeTldr: true },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('find backfills tldr when legacy row lacks it', async () => {
    const narrative =
      'You both like cooking. That makes an easy first chat. Extra.';
    findUnique.mockResolvedValue({ narrative, narrativeTldr: null });
    const entry = await service.find(key);
    expect(entry?.narrative).toBe(narrative);
    expect(entry?.narrativeTldr).toBe(buildNarrativeTldr(narrative));
    expect(update).toHaveBeenCalled();
  });

  it('find returns null on miss', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.find(key)).resolves.toBeNull();
  });

  it('upsert writes create/update payload with tldr', async () => {
    upsert.mockResolvedValue({});
    await service.upsert({
      ...key,
      narrative: 'llm text here.',
      narrativeTldr: 'llm text here.',
      model: 'gpt-test',
    });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion:
          key,
      },
      create: {
        ...key,
        narrative: 'llm text here.',
        narrativeTldr: 'llm text here.',
        model: 'gpt-test',
      },
      update: {
        narrative: 'llm text here.',
        narrativeTldr: 'llm text here.',
        model: 'gpt-test',
      },
    });
  });
});
