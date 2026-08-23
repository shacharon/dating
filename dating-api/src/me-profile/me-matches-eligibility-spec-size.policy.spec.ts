import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 69 Story 04 — eligibility harness barrel stays thin. */
const MAX_SPEC_SUPPORT_NON_EMPTY_LINES = 600;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('me-matches-eligibility spec size policy', () => {
  const meProfileDir = __dirname;

  it('me-matches-eligibility.spec-support.ts stays thin (barrel only)', () => {
    const count = nonEmptyLineCount(
      path.join(meProfileDir, 'me-matches-eligibility.spec-support.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_SPEC_SUPPORT_NON_EMPTY_LINES);
  });
});
