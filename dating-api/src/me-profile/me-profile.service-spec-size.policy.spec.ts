import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 69 Story 03 — keep split me-profile service specs under reviewable size. */
const MAX_SPLIT_NON_EMPTY_LINES = 700;
const MAX_SPEC_SUPPORT_NON_EMPTY_LINES = 400;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('me-profile.service spec size policy', () => {
  const meProfileDir = __dirname;

  const splitSpecFiles = [
    'me-profile.service.crud.spec.ts',
    'me-profile.service.submit.spec.ts',
    'me-profile.service.legacy-isolation.spec.ts',
    'me-profile.service.analysis.spec.ts',
    'me-profile.service.preferences.spec.ts',
    'me-profile.service.moderation.spec.ts',
    'me-profile.service.rank-rebuild.spec.ts',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(meProfileDir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_SPLIT_NON_EMPTY_LINES);
    },
  );

  it('me-profile.service.spec-support.ts stays within support budget', () => {
    const count = nonEmptyLineCount(
      path.join(meProfileDir, 'me-profile.service.spec-support.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_SPEC_SUPPORT_NON_EMPTY_LINES);
  });

  it('does not keep monolith me-profile.service.spec.ts', () => {
    expect(
      fs.existsSync(path.join(meProfileDir, 'me-profile.service.spec.ts')),
    ).toBe(false);
  });
});
