import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 69 Story 02 — keep split me-profile HTTP specs under reviewable size. */
const MAX_NON_EMPTY_LINES = 750;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('me-profile-http spec size policy', () => {
  const meProfileDir = __dirname;

  const splitSpecFiles = [
    'me-profile-http-crud-profile.integration.spec.ts',
    'me-profile-http-crud-preferences.integration.spec.ts',
    'me-profile-http-crud-analysis.integration.spec.ts',
    'me-profile-http-crud-observability.integration.spec.ts',
    'me-profile-http-conversations-list.integration.spec.ts',
    'me-profile-http-conversations-detail.integration.spec.ts',
    'me-profile-http-conversations-messages.integration.spec.ts',
    'me-profile-http-conversations-read.integration.spec.ts',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(meProfileDir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith me-profile-http-crud.integration.spec.ts', () => {
    expect(
      fs.existsSync(path.join(meProfileDir, 'me-profile-http-crud.integration.spec.ts')),
    ).toBe(false);
  });

  it('does not keep monolith me-profile-http-conversations.integration.spec.ts', () => {
    expect(
      fs.existsSync(
        path.join(meProfileDir, 'me-profile-http-conversations.integration.spec.ts'),
      ),
    ).toBe(false);
  });
});
