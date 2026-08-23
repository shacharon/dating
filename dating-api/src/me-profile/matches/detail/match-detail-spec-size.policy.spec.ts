import * as fs from 'node:fs';
import * as path from 'node:path';

/** Sprint 71 Story 04 — keep split MatchDetailService under reviewable size. */
const MAX_FACADE_NON_EMPTY_LINES = 150;
const MAX_QUERY_NON_EMPTY_LINES = 250;
const MAX_PHOTO_NON_EMPTY_LINES = 120;

function nonEmptyLineCount(filePath: string): number {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length;
}

describe('match detail spec size policy', () => {
  const dir = __dirname;

  it('match-detail.service.ts has at most facade LOC cap', () => {
    const count = nonEmptyLineCount(
      path.join(dir, 'match-detail.service.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_FACADE_NON_EMPTY_LINES);
  });

  it('match-detail-query.service.ts has at most query LOC cap', () => {
    const count = nonEmptyLineCount(
      path.join(dir, 'match-detail-query.service.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_QUERY_NON_EMPTY_LINES);
  });

  it('match-detail-photo.service.ts has at most photo LOC cap', () => {
    const count = nonEmptyLineCount(
      path.join(dir, 'match-detail-photo.service.ts'),
    );
    expect(count).toBeLessThanOrEqual(MAX_PHOTO_NON_EMPTY_LINES);
  });
});
