import { PrismaMatchNarrativeCacheRepository } from './prisma-match-narrative-cache.repository';

describe('PrismaMatchNarrativeCacheRepository', () => {
  const findUnique = jest.fn();
  const upsert = jest.fn();
  const prisma = {
    matchNarrativeCache: { findUnique, upsert },
  };
  const repository = new PrismaMatchNarrativeCacheRepository(prisma as never);

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
  });

  it('find returns narrative on hit', async () => {
    findUnique.mockResolvedValue({ narrative: 'cached' });
    await expect(repository.find(key)).resolves.toBe('cached');
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion:
          key,
      },
      select: { narrative: true },
    });
  });

  it('find returns null on miss', async () => {
    findUnique.mockResolvedValue(null);
    await expect(repository.find(key)).resolves.toBeNull();
  });

  it('upsert writes create/update payload', async () => {
    upsert.mockResolvedValue({});
    await repository.upsert({ ...key, narrative: 'llm text', model: 'gpt-test' });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion:
          key,
      },
      create: { ...key, narrative: 'llm text', model: 'gpt-test' },
      update: { narrative: 'llm text', model: 'gpt-test' },
    });
  });
});
