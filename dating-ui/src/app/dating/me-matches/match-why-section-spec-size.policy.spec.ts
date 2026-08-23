import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';

/** FE Sprint 07 Story 01 — keep split match-why-section specs under reviewable size. */
const MAX_NON_EMPTY_LINES = 400;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('match-why-section spec size policy', () => {
  const dir = __dirname;

  const splitSpecFiles = [
    'match-why-section.spec-support.tsx',
    'match-why-section.expansion-01-04.spec.tsx',
    'match-why-section.expansion-05-09.spec.tsx',
    'match-why-section.expansion-10-13.spec.tsx',
    'match-why-section.expansion-14-15.spec.tsx',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith match-why-section.spec.tsx', () => {
    expect(fs.existsSync(path.join(dir, 'match-why-section.spec.tsx'))).toBe(
      false,
    );
  });
});
