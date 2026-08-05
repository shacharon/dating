import {
  buildNarrativeTldr,
  NARRATIVE_TLDR_MAX_CHARS,
} from './match-narrative-tldr';

describe('buildNarrativeTldr', () => {
  it('returns empty for blank input', () => {
    expect(buildNarrativeTldr('')).toBe('');
    expect(buildNarrativeTldr('   ')).toBe('');
  });

  it('uses one long first sentence', () => {
    const first =
      'You both care about building a calm home and talking things through when life gets loud.';
    expect(first.length).toBeGreaterThanOrEqual(80);
    const narrative = `${first} There is more after. And another.`;
    expect(buildNarrativeTldr(narrative)).toBe(first);
  });

  it('adds a second sentence when the first is short', () => {
    const narrative =
      'You both like cooking. That makes an easy first chat. More prose here.';
    expect(buildNarrativeTldr(narrative)).toBe(
      'You both like cooking. That makes an easy first chat.',
    );
  });

  it('caps at max chars with ellipsis', () => {
    const long =
      'Word '.repeat(80).trim() +
      '. Second sentence is here but should often be truncated away.';
    const tldr = buildNarrativeTldr(long);
    expect(tldr.length).toBeLessThanOrEqual(NARRATIVE_TLDR_MAX_CHARS);
    expect(tldr.endsWith('…')).toBe(true);
  });

  it('is a prefix of the full narrative (same words)', () => {
    const narrative =
      'Shared pace of life shows up clearly. Kids timing looks aligned too. Watch money talks.';
    const tldr = buildNarrativeTldr(narrative);
    expect(narrative.startsWith(tldr.replace(/…$/, '').trim()) || narrative.includes(tldr.slice(0, 40))).toBe(
      true,
    );
    expect(tldr.toLowerCase()).not.toContain('say hello');
    expect(tldr.toLowerCase()).not.toContain('thin fit');
  });
});
