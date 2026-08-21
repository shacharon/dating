import * as fs from 'node:fs';
import * as path from 'node:path';
import { isNegatedBefore as fromShared } from '../shared/text-match.utils';
import { isNegatedBefore as fromDealbreaker } from './dealbreaker-signals-text.extract';

describe('HG text-match shared wiring (sprint-60 story 2)', () => {
  const extractors = [
    'interest-tags-text.extract.ts',
    'lifestyle-signals-text.extract.ts',
    'personality-traits-text.extract.ts',
    'dealbreaker-signals-text.extract.ts',
  ] as const;

  it('four extractors import shared text-match utils (no local helper defs)', () => {
    for (const name of extractors) {
      const src = fs.readFileSync(path.join(__dirname, name), 'utf8');
      expect(src).toContain("from '../shared/text-match.utils'");
      expect(src).not.toMatch(/function escapeRegExp\s*\(/);
      expect(src).not.toMatch(/function isNegatedBefore\s*\(/);
    }
  });

  it('dealbreaker re-export is the same function as shared', () => {
    expect(fromDealbreaker).toBe(fromShared);
    const s = 'not a smoker here';
    expect(fromDealbreaker(s, s.indexOf('smoker'))).toBe(true);
  });
});
