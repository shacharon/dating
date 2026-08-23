import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 65 Story 03 — keep split matches HTTP integration specs under reviewable size. */
const MAX_NON_EMPTY_LINES = 1000;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('me-profile-http-matches spec size policy', () => {
  const meProfileDir = __dirname;

  const splitSpecFiles = [
    'me-profile-http-matches-list-detail.integration.spec.ts',
    'me-profile-http-matches-narrative-feedback.integration.spec.ts',
    'me-profile-http-matches-actions.integration.spec.ts',
    'me-profile-http-matches-mutual.integration.spec.ts',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(meProfileDir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith me-profile-http-matches.integration.spec.ts', () => {
    expect(
      fs.existsSync(
        path.join(meProfileDir, 'me-profile-http-matches.integration.spec.ts'),
      ),
    ).toBe(false);
  });
});
