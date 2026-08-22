import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 65 Story 01 — keep split extraction specs under reviewable size. */
const MAX_NON_EMPTY_LINES = 1000;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('extraction spec size policy', () => {
  const extractionDir = __dirname;

  const splitSpecFiles = [
    'extraction.service.core.spec.ts',
    'extraction-behavior-locks.spec.ts',
    'extraction-expansion-shadow-signal3-04.spec.ts',
    'extraction-expansion-shadow-05-08.spec.ts',
    'extraction-expansion-shadow-10-13.spec.ts',
    'extraction-expansion-shadow-14-15-09.spec.ts',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(extractionDir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith extraction.service.spec.ts', () => {
    expect(
      fs.existsSync(path.join(extractionDir, 'extraction.service.spec.ts')),
    ).toBe(false);
  });
});
