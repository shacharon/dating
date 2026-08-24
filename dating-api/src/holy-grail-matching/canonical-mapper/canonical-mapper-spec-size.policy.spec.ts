import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 72 Story 01 — keep split profile-to-canonical mapper under reviewable size. */
const MAX_ORCHESTRATOR_NON_EMPTY_LINES = 150;
const MAX_SLICE_NON_EMPTY_LINES = 200;
const MAX_ROOT_REEXPORT_NON_EMPTY_LINES = 40;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('canonical mapper spec size policy', () => {
  const dir = __dirname;
  const parentDir = path.join(dir, '..');

  it('root profile-to-canonical.mapper.ts stays a thin re-export', () => {
    const rootPath = path.join(parentDir, 'profile-to-canonical.mapper.ts');
    const source = fs.readFileSync(rootPath, 'utf8');
    expect(nonEmptyLineCount(rootPath)).toBeLessThanOrEqual(
      MAX_ROOT_REEXPORT_NON_EMPTY_LINES,
    );
    expect(source).not.toMatch(/\bfunction buildFacts\b/);
    expect(source).toMatch(
      /export\s*\{\s*mapProfileSourceToMatchingCanonical\s*\}\s*from/,
    );
  });

  it('orchestrator has at most 150 non-empty lines', () => {
    const count = nonEmptyLineCount(
      path.join(dir, 'profile-to-canonical.mapper.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_ORCHESTRATOR_NON_EMPTY_LINES);
  });

  const sliceFiles = [
    'canonical-mapper.validation.ts',
    'map-extraction-arrays.slice.ts',
    'map-structured-facts.slice.ts',
    'map-structured-preferences.slice.ts',
    'map-search-overrides.slice.ts',
    'map-ranking-signals.slice.ts',
  ];

  it.each(sliceFiles)(
    `%s has at most ${MAX_SLICE_NON_EMPTY_LINES} non-empty lines`,
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_SLICE_NON_EMPTY_LINES);
    },
  );
});
