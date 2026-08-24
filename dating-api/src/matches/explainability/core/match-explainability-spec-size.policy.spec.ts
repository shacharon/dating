import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 72 Story 02 — keep thinned match-explainability modules under reviewable size. */
const MAX_FILE_NON_EMPTY_LINES = 300;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('match-explainability spec size policy', () => {
  const dir = __dirname;

  const productionFiles = [
    'match-explainability.ts',
    'match-explainability.labels.ts',
    'match-explainability.chips.ts',
    'match-explainability.reason.ts',
    'match-explainability.reason-templates.ts',
  ];

  it.each(productionFiles)(
    `%s has at most ${MAX_FILE_NON_EMPTY_LINES} non-empty lines`,
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_FILE_NON_EMPTY_LINES);
    },
  );
});
