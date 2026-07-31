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

  it('builds plain line from Ambition + Emotional depth without chip labels', () => {
    const line = buildPlainMatchListTldr({
      finalScore: 55,
      positiveChips: ['Ambition alignment', 'Emotional depth', 'Lifestyle pace'],
    });
    expect(line).toBe(
      'You both share a drive for goals and real depth and presence.',
    );
    expect(line.length).toBeLessThanOrEqual(LIST_TLDR_MAX_CHARS);
    assertNoChipLabels(line);
  });

  it('uses single-phrase template', () => {
    const line = buildPlainMatchListTldr({
      finalScore: 70,
      positiveChips: ['Lifestyle pace'],
    });
    expect(line).toBe('Clear overlap: a similar daily pace.');
    assertNoChipLabels(line);
  });

  it('uses band line when chips empty', () => {
    expect(
      buildPlainMatchListTldr({ finalScore: 65, positiveChips: [] }),
    ).toBe('Some real overlap — open to see why.');
    expect(
      buildPlainMatchListTldr({ finalScore: 45, positiveChips: [] }),
    ).toBe('A few touchpoints — open to see why.');
    expect(
      buildPlainMatchListTldr({ finalScore: 20, positiveChips: [] }),
    ).toBe('Limited overlap — open only if curious.');
  });

  it('uses band line when only unknown chips', () => {
    const line = buildPlainMatchListTldr({
      finalScore: 72,
      positiveChips: ['Totally Fake Chip', 'Another Unknown'],
    });
    expect(line).toBe('Some real overlap — open to see why.');
    assertNoChipLabels(line);
    expect(textContainsChipLabel(line)).toBeNull();
  });

  it('skips unknown chips', () => {
    const line = buildPlainMatchListTldr({
      finalScore: 50,
      positiveChips: ['Unknown Chip', 'Emotional depth'],
    });
    expect(line).toBe('Clear overlap: real depth and presence.');
    assertNoChipLabels(line);
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
      'You both share a very long first phrase that keeps going forever and another equally long second phrase that must be cut.';
    expect(long.length).toBeGreaterThan(LIST_TLDR_MAX_CHARS);
    const truncated = truncateListTldrLine(long, LIST_TLDR_MAX_CHARS);
    expect(truncated.length).toBeLessThanOrEqual(LIST_TLDR_MAX_CHARS);
    expect(truncated.endsWith('…')).toBe(true);
    expect(truncated).not.toContain('cut.');
  });
});

describe('textContainsChipLabel', () => {
  it('detects Ambition alignment and ignores plain prose', () => {
    expect(
      textContainsChipLabel(
        'You share real overlap on Ambition alignment today.',
      ),
    ).toBe('Ambition alignment');
    expect(textContainsChipLabel('Clear overlap: a drive for goals.')).toBeNull();
  });
});
