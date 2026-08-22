import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 65 Story 02 — keep split match-engine specs under reviewable size. */
const MAX_NON_EMPTY_LINES = 1000;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('match-engine spec size policy', () => {
  const matchesDir = __dirname;

  const splitSpecFiles = [
    'match-engine-expansion-shadow-01-04.spec.ts',
    'match-engine-expansion-shadow-05-09.spec.ts',
    'match-engine-expansion-shadow-10-13.spec.ts',
    'match-engine-expansion-shadow-14-15.spec.ts',
    'match-engine.compare.spec.ts',
    'match-engine.compare-path-coverage.spec.ts',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(matchesDir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith match-engine.spec.ts', () => {
    expect(
      fs.existsSync(path.join(matchesDir, 'match-engine.spec.ts')),
    ).toBe(false);
  });
});
