import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 71 Story 03 — keep split MeConversationsService under reviewable size. */
const MAX_FACADE_NON_EMPTY_LINES = 150;
const MAX_COLLABORATOR_NON_EMPTY_LINES = 200;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('me conversations spec size policy', () => {
  const dir = __dirname;

  it('me-conversations.service.ts has at most facade LOC cap', () => {
    const count = nonEmptyLineCount(
      path.join(dir, 'me-conversations.service.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_FACADE_NON_EMPTY_LINES);
  });

  const collaboratorFiles = [
    'conversation-list.service.ts',
    'conversation-read-state.service.ts',
    'conversation-lifecycle.service.ts',
  ];

  it.each(collaboratorFiles)(
    '%s has at most %i non-empty lines',
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_COLLABORATOR_NON_EMPTY_LINES);
    },
  );
});
