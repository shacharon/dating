import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 69 Story 04 — keep split evaluate specs under reviewable size. */
const MAX_SPLIT_NON_EMPTY_LINES = 700;
const MAX_SPEC_SUPPORT_NON_EMPTY_LINES = 400;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('evaluate.service spec size policy', () => {
  const evaluateDir = __dirname;

  const splitSpecFiles = [
    'evaluate.service.orchestration.spec.ts',
    'evaluate.service.extended-signals.spec.ts',
    'evaluate.service.chips.spec.ts',
    'evaluate.service.resilience.spec.ts',
  ];

  it.each(splitSpecFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(evaluateDir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_SPLIT_NON_EMPTY_LINES);
    },
  );

  it('evaluate.service.spec-support.ts stays within support budget', () => {
    const count = nonEmptyLineCount(
      path.join(evaluateDir, 'evaluate.service.spec-support.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_SPEC_SUPPORT_NON_EMPTY_LINES);
  });

  it('does not keep monolith evaluate.service.spec.ts', () => {
    expect(
      fs.existsSync(path.join(evaluateDir, 'evaluate.service.spec.ts')),
    ).toBe(false);
  });
});
