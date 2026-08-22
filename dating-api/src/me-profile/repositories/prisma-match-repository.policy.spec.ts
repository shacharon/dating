import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaMatchRepository } from './prisma-match.repository';
import type { IMatchRepository } from './match.repository';

describe('prisma-match repository policy (sprint-64 story 03)', () => {
  it('adapter stays within accepted LOC budget (no split this story)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, 'prisma-match.repository.ts'),
      'utf8',
    );
    const lineCount = src
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0).length;
    expect(lineCount).toBeLessThanOrEqual(450);
  });

  it('PrismaMatchRepository implements IMatchRepository', () => {
    const repo: IMatchRepository = {} as PrismaMatchRepository;
    expect(repo).toBeDefined();
  });
});
