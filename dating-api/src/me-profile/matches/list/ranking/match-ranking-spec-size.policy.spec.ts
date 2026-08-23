import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 71 Story 01 — keep split match ranking pipeline under reviewable size. */
const MAX_ORCHESTRATOR_NON_EMPTY_LINES = 200;
const MAX_COLLABORATOR_NON_EMPTY_LINES = 250;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('match ranking spec size policy', () => {
  const dir = __dirname;

  it('match-ranking.service.ts has at most orchestrator LOC cap', () => {
    const count = nonEmptyLineCount(path.join(dir, 'match-ranking.service.ts'));
    expect(count).toBeLessThanOrEqual(MAX_ORCHESTRATOR_NON_EMPTY_LINES);
  });

  const collaboratorFiles = [
    'match-list-candidate-loader.service.ts',
    'match-list-candidate-scorer.service.ts',
    'match-list-response-assembler.service.ts',
    'match-list-rank-telemetry.service.ts',
  ];

  it.each(collaboratorFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_COLLABORATOR_NON_EMPTY_LINES);
    },
  );

  it('does not keep monolith match-ranking.service.ts at list/ root', () => {
    expect(
      fs.existsSync(path.join(dir, '..', 'match-ranking.service.ts')),
    ).toBe(false);
  });
});
