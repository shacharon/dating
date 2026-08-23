import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 71 Story 02 — keep split legacy MatchesService under reviewable size. */
const MAX_FACADE_NON_EMPTY_LINES = 150;
const MAX_COLLABORATOR_NON_EMPTY_LINES = 250;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('matches service spec size policy', () => {
  const rootDir = __dirname;

  it('matches.service.ts has at most facade LOC cap', () => {
    const count = nonEmptyLineCount(path.join(rootDir, 'matches.service.ts'));
    expect(count).toBeLessThanOrEqual(MAX_FACADE_NON_EMPTY_LINES);
  });

  const collaboratorFiles = [
    ['admin', 'matches-compare.service.ts'],
    ['admin', 'matches-feature-flags.service.ts'],
    ['api', 'matches-admin-list.service.ts'],
    ['api', 'matches-hg-diagnostics.service.ts'],
  ] as const;

  it.each(collaboratorFiles)(
    '%s/%s has at most %i non-empty lines',
    (folder, fileName) => {
      const count = nonEmptyLineCount(path.join(rootDir, folder, fileName));
      expect(count).toBeLessThanOrEqual(MAX_COLLABORATOR_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith MatchesService logic above collaborator LOC cap at root', () => {
    const count = nonEmptyLineCount(path.join(rootDir, 'matches.service.ts'));
    expect(count).toBeLessThanOrEqual(MAX_FACADE_NON_EMPTY_LINES);
  });
});
