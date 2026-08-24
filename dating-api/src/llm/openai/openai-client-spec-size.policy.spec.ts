import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 72 Story 02 — keep thinned openai client modules under reviewable size. */
const MAX_FILE_NON_EMPTY_LINES = 300;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('openai client spec size policy', () => {
  const dir = __dirname;

  const productionFiles = [
    'openai.client.ts',
    'openai-response-text.ts',
    'openai-client-debug.ts',
    'openai-client-telemetry.ts',
  ];

  it.each(productionFiles)(
    `%s has at most ${MAX_FILE_NON_EMPTY_LINES} non-empty lines`,
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_FILE_NON_EMPTY_LINES);
    },
  );
});
