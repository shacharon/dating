import {
  buildPlainMatchListTldr,
  LIST_TLDR_MAX_CHARS,
  truncateListTldrLine,
} from './match-list-tldr';
import {
  CHIP_TO_TRAIT,
  textContainsChipLabel,
} from './match-explanation-traits';

describe('buildPlainMatchListTldr', () => {
  const chipKeys = Object.keys(CHIP_TO_TRAIT);

  function assertNoChipLabels(text: string) {
    expect(textContainsChipLabel(text)).toBeNull();
    const lower = text.toLowerCase();
    for (const key of chipKeys) {
      expect(lower).not.toContain(key.toLowerCase());
    }
  }

  it('prefers shared interest opener over chips', () => {
    const line = buildPlainMatchListTldr({
      finalScore: 55,
      positiveChips: ['Ambition alignment', 'Emotional depth'],
      sharedInterestNote: 'You both enjoy hiking, cooking.',
    });
    expect(line).toBe(
      "You're both into hiking and cooking — ask about that.",
    );
    expect(line.length).toBeLessThanOrEqual(LIST_TLDR_MAX_CHARS);
    assertNoChipLabels(line);
  });

  it('uses same-place opener when no shared interest', () => {
    const line = buildPlainMatchListTldr({
      finalScore: 70,
      positiveChips: ['Lifestyle pace'],
      viewerPlace: 'Tel Aviv, IL',
      candidatePlace: 'Tel Aviv',
    });
    expect(line).toBe("You're both in Tel Aviv — coffee wouldn't be hard.");
    assertNoChipLabels(line);
  });

  it('uses tension caution when no interest or place', () => {
    const line = buildPlainMatchListTldr({
      finalScore: 72,
      positiveChips: ['Ambition alignment'],
      tensionChip: 'Closeness vs space',
    });
    expect(line).toBe(
      'Heads up on closeness vs space — read their profile before you write.',
    );
    assertNoChipLabels(line);
  });

  it('uses human decide band when chips empty and no hooks', () => {
    expect(
      buildPlainMatchListTldr({ finalScore: 85, positiveChips: [] }),
    ).toBe('This one feels like a real match — say hello.');
    expect(
      buildPlainMatchListTldr({ finalScore: 65, positiveChips: [] }),
    ).toBe("There's something here — open their profile and see.");
    expect(
      buildPlainMatchListTldr({ finalScore: 45, positiveChips: [] }),
    ).toBe("Thin fit so far — only dig in if you're curious.");
    expect(
      buildPlainMatchListTldr({ finalScore: 20, positiveChips: [] }),
    ).toBe("Not much clicking yet — skip unless something pulls you in.");
  });

  it('avoids product jargon and trait-soup', () => {
    const line = buildPlainMatchListTldr({
      finalScore: 55,
      positiveChips: ['Ambition alignment', 'Emotional depth', 'Lifestyle pace'],
    });
    expect(line.toLowerCase()).not.toContain('you both share');
    expect(line.toLowerCase()).not.toContain('overlap');
    expect(line.toLowerCase()).not.toContain('touchpoints');
    expect(line.toLowerCase()).not.toContain('a drive for goals');
    expect(line).toBe("Thin fit so far — only dig in if you're curious.");
  });

  it('every listPhrase avoids chip-label substrings', () => {
    for (const [chip, meta] of Object.entries(CHIP_TO_TRAIT)) {
      expect(meta.listPhrase.toLowerCase()).not.toContain(chip.toLowerCase());
      expect(meta.listPhrase.toLowerCase()).not.toContain('alignment');
      expect(meta.listPhrase.toLowerCase()).not.toContain('compatibility');
    }
  });

  it('truncates at word boundary with ellipsis', () => {
    const long =
      'You both enjoy hiking, cooking, travel, photography, yoga, and many more shared hobbies that absolutely must be truncated for the browse card line.';
    expect(long.length).toBeGreaterThan(LIST_TLDR_MAX_CHARS);
    const truncated = truncateListTldrLine(long, LIST_TLDR_MAX_CHARS);
    expect(truncated.length).toBeLessThanOrEqual(LIST_TLDR_MAX_CHARS);
    expect(truncated.endsWith('…')).toBe(true);
  });
});

describe('textContainsChipLabel', () => {
  it('detects Ambition alignment and ignores plain prose', () => {
    expect(
      textContainsChipLabel(
        'You share real overlap on Ambition alignment today.',
      ),
    ).toBe('Ambition alignment');
    expect(
      textContainsChipLabel('This one feels like a real match — say hello.'),
    ).toBeNull();
  });
});
