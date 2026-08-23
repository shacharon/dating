import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 69 Story 01 — keep split compute-friction specs under reviewable size. */
const MAX_NON_EMPTY_LINES = 800;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('compute-friction spec size policy', () => {
  const engineDir = __dirname;

  const splitSpecFiles = [
    'compute-friction.core.spec.ts',
    'compute-friction-expansion-shadow-01-04.spec.ts',
    'compute-friction-expansion-shadow-05-09.spec.ts',
    'compute-friction-expansion-shadow-10-13.spec.ts',
    'compute-friction-expansion-shadow-14-15.spec.ts',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(engineDir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith compute-friction.spec.ts', () => {
    expect(
      fs.existsSync(path.join(engineDir, 'compute-friction.spec.ts')),
    ).toBe(false);
  });
});
