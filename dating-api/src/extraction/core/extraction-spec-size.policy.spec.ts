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
  const coreDir = __dirname;
  const shadowDir = path.join(__dirname, '..', 'shadow');
  const extractionRoot = path.join(__dirname, '..');

  const splitSpecFiles: Array<{ dir: string; fileName: string }> = [
    { dir: coreDir, fileName: 'extraction.service.core.spec.ts' },
    { dir: coreDir, fileName: 'extraction-behavior-locks.spec.ts' },
    {
      dir: shadowDir,
      fileName: 'extraction-expansion-shadow-signal3-04.spec.ts',
    },
    {
      dir: shadowDir,
      fileName: 'extraction-expansion-shadow-05-08.spec.ts',
    },
    {
      dir: shadowDir,
      fileName: 'extraction-expansion-shadow-10-13.spec.ts',
    },
    {
      dir: shadowDir,
      fileName: 'extraction-expansion-shadow-14-15-09.spec.ts',
    },
  ];

  it.each(splitSpecFiles)(
    `$fileName has at most ${MAX_NON_EMPTY_LINES} non-empty lines`,
    ({ dir, fileName }) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith extraction.service.spec.ts', () => {
    expect(
      fs.existsSync(path.join(extractionRoot, 'extraction.service.spec.ts')),
    ).toBe(false);
  });
});
