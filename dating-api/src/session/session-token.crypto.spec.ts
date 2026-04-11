import {
  generateSessionToken,
  hashSessionToken,
} from './session-token.crypto';

describe('session-token.crypto', () => {
  describe('generateSessionToken', () => {
    it('produces base64url strings with strong length (32 random bytes)', () => {
      const a = generateSessionToken();
      expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(a.length).toBeGreaterThanOrEqual(40);
    });

    it('returns distinct values across calls (no accidental low entropy)', () => {
      const set = new Set<string>();
      for (let i = 0; i < 50; i += 1) {
        set.add(generateSessionToken());
      }
      expect(set.size).toBe(50);
    });
  });

  describe('hashSessionToken', () => {
    it('is deterministic for the same token and pepper', () => {
      const h1 = hashSessionToken('raw', 'pepper');
      const h2 = hashSessionToken('raw', 'pepper');
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('changes when pepper changes', () => {
      const a = hashSessionToken('same', 'p1');
      const b = hashSessionToken('same', 'p2');
      expect(a).not.toBe(b);
    });

    it('changes when raw token changes', () => {
      const a = hashSessionToken('a', 'pepper');
      const b = hashSessionToken('b', 'pepper');
      expect(a).not.toBe(b);
    });
  });
});
