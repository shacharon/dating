import { escapeRegExp, isNegatedBefore } from './text-match.utils';

describe('text-match.utils (sprint-60 story 2)', () => {
  describe('escapeRegExp', () => {
    it('escapes regex metacharacters', () => {
      expect(escapeRegExp('a.b+c?')).toBe('a\\.b\\+c\\?');
      expect(escapeRegExp('foo[bar]')).toBe('foo\\[bar\\]');
      expect(new RegExp(escapeRegExp('a.b')).test('a.b')).toBe(true);
      expect(new RegExp(escapeRegExp('a.b')).test('axb')).toBe(false);
    });
  });

  describe('isNegatedBefore', () => {
    it('detects lightweight not-scope (dealbreaker sample)', () => {
      const s = 'not a smoker here';
      const idx = s.indexOf('smoker');
      expect(isNegatedBefore(s, idx)).toBe(true);
    });

    it('detects negation within 6 words', () => {
      const s = 'i am not very interested';
      expect(isNegatedBefore(s, s.indexOf('interested'))).toBe(true);
    });

    it('ignores negation beyond 6 words', () => {
      const s = 'not a b c d e f g interested';
      expect(isNegatedBefore(s, s.indexOf('interested'))).toBe(false);
    });

    it('handles not at phrase boundary', () => {
      const s = 'not interested';
      expect(isNegatedBefore(s, s.indexOf('interested'))).toBe(true);
    });
  });
});
