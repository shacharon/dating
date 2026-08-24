import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 72 Story 03 — PhotoModerationService thin facade + collaborators.
 * Caps: facade ≤200; no in-scope production file >250.
 */
const MAX_FACADE_NON_EMPTY_LINES = 200;
const MAX_IN_SCOPE_NON_EMPTY_LINES = 250;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('photo moderation spec size policy', () => {
  const dir = __dirname;

  it('photo-moderation.service.ts has at most facade LOC cap', () => {
    const count = nonEmptyLineCount(
      path.join(dir, 'photo-moderation.service.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_FACADE_NON_EMPTY_LINES);
  });

  const productionFiles = [
    'photo-moderation.service.ts',
    'photo-moderation-decision.service.ts',
    'photo-moderation-apply.service.ts',
  ];

  it.each(productionFiles)(
    `%s has at most ${MAX_IN_SCOPE_NON_EMPTY_LINES} non-empty lines`,
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_IN_SCOPE_NON_EMPTY_LINES);
    },
  );
});
