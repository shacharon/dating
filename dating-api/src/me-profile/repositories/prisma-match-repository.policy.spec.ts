import * as fs from 'node:fs';
import * as path from 'node:path';

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

  it('PrismaMatchRepository declares IMatchRepository implementation', () => {
    const src = fs.readFileSync(
      path.join(__dirname, 'prisma-match.repository.ts'),
      'utf8',
    );
    expect(src).toContain('implements IMatchRepository');
    expect(src).toContain('export class PrismaMatchRepository');
  });
});
