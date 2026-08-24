import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 72 Story 03 — MeConversationMessagesService thin facade + collaborators.
 * Caps: facade ≤200; no in-scope production file >250.
 */
const MAX_FACADE_NON_EMPTY_LINES = 200;
const MAX_IN_SCOPE_NON_EMPTY_LINES = 250;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('me conversation messages spec size policy', () => {
  const dir = __dirname;

  it('me-conversation-messages.service.ts has at most facade LOC cap', () => {
    const count = nonEmptyLineCount(
      path.join(dir, 'me-conversation-messages.service.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_FACADE_NON_EMPTY_LINES);
  });

  const productionFiles = [
    'me-conversation-messages.service.ts',
    'me-conversation-message-list.service.ts',
    'me-conversation-message-send.service.ts',
    'me-conversation-message-fanout.service.ts',
  ];

  it.each(productionFiles)(
    `%s has at most ${MAX_IN_SCOPE_NON_EMPTY_LINES} non-empty lines`,
    (fileName) => {
      const count = nonEmptyLineCount(path.join(dir, fileName));
      expect(count).toBeLessThanOrEqual(MAX_IN_SCOPE_NON_EMPTY_LINES);
    },
  );
});
