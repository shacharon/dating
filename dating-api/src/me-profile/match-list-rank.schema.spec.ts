import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';
import { toStoredMatchListScore } from './match-list-rank-score';

describe('toStoredMatchListScore', () => {
  it('maps null/undefined/non-finite to -1', () => {
    expect(toStoredMatchListScore(null)).toBe(-1);
    expect(toStoredMatchListScore(undefined)).toBe(-1);
    expect(toStoredMatchListScore(Number.NaN)).toBe(-1);
  });

  it('passes through finite engine scores including 0', () => {
    expect(toStoredMatchListScore(0)).toBe(0);
    expect(toStoredMatchListScore(87.5)).toBe(87.5);
  });
});

describe('MatchListRank schema contract', () => {
  const schema = readFileSync(
    join(__dirname, '../../prisma/schema.prisma'),
    'utf8',
  );

  const modelBlock = schema.match(/model MatchListRank \{[\s\S]*?\n\}/)?.[0] ?? '';

  it('defines MatchListRank with locked columns and unique pair', () => {
    expect(modelBlock).toContain('viewerUserId');
    expect(modelBlock).toContain('candidateProfileId');
    expect(modelBlock).toContain('matchScore');
    expect(modelBlock).toContain('hardBlocked');
    expect(modelBlock).toContain('builtAt');
    expect(modelBlock).toContain('@@unique([viewerUserId, candidateProfileId])');
    expect(modelBlock).toContain(
      '@@index([viewerUserId, hardBlocked, matchScore(sort: Desc), candidateProfileId])',
    );
    expect(modelBlock).not.toContain('sourceJobId');
    expect(modelBlock).not.toContain('rebuildGeneration');
  });

  it('exposes MatchListRank on Prisma client namespace', () => {
    expect(Prisma.ModelName.MatchListRank).toBe('MatchListRank');
  });
});

describe('MatchListRank create + unique (mocked Prisma)', () => {
  it('create with matchScore -1 succeeds; duplicate pair raises P2002', async () => {
    const create = jest.fn();
    const prisma = { matchListRank: { create } };

    const row = {
      id: 'mlr_1',
      viewerUserId: 'user_v',
      candidateProfileId: 'prof_c',
      matchScore: -1,
      hardBlocked: false,
      builtAt: new Date('2026-08-01T12:00:00.000Z'),
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
      updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    };

    create.mockResolvedValueOnce(row);
    const first = await prisma.matchListRank.create({
      data: {
        viewerUserId: 'user_v',
        candidateProfileId: 'prof_c',
        matchScore: toStoredMatchListScore(null),
        hardBlocked: false,
        builtAt: row.builtAt,
      },
    });
    expect(first.matchScore).toBe(-1);

    create.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['viewerUserId', 'candidateProfileId'] },
      }),
    );
    await expect(
      prisma.matchListRank.create({
        data: {
          viewerUserId: 'user_v',
          candidateProfileId: 'prof_c',
          matchScore: 50,
          hardBlocked: false,
          builtAt: row.builtAt,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
