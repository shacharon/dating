import {
  validateExtraction,
  quoteContainsBannedMarkers,
  quoteIsExactSubstringOf,
  reasonMeetsContract,
  reasonWordCount,
  MAX_EVIDENCE_REASON_WORDS,
} from './extraction-strict-validation';
import { EXTRACTION_SIGNAL_KEYS, type ExtractedSignals } from './extracted-signals.interface';

function emptySignalsRecord(): Record<string, number | null> {
  return Object.fromEntries(EXTRACTION_SIGNAL_KEYS.map((k) => [k, null])) as Record<
    string,
    number | null
  >;
}

function baseSelf(partial: Partial<ExtractedSignals> = {}): ExtractedSignals {
  const { signals: partialSignals, evidence, ...rest } = partial;
  return {
    domain: 'self',
    signals: { ...emptySignalsRecord(), ...partialSignals },
    evidence: evidence ?? [],
    version: 'v1',
    confidence: 0.8,
    ...rest,
  };
}

describe('extraction-strict-validation', () => {
  const text = 'I love slow Sundays and long walks in the park.';

  it('removes signal when quote contains inferred:', () => {
    const extraction = baseSelf({
      signals: { ambition: 7 },
      evidence: [
        {
          signal: 'ambition',
          quote: 'inferred: some_rule_id',
          reason: 'Would be valid length',
        },
      ],
    });
    const out = validateExtraction(text, extraction);
    expect(out.signals['ambition']).toBeNull();
    expect(out.evidence).toHaveLength(0);
    expect(out.domainStatus).toBe('LOW_DATA');
  });

  it('whitespace-only input yields UNRELIABLE and clears signals', () => {
    const extraction = baseSelf({
      signals: { ambition: 8, directness: 6 },
      evidence: [
        { signal: 'ambition', quote: 'slow Sundays', reason: 'Valid reason here' },
        { signal: 'directness', quote: 'slow Sundays', reason: 'Also valid' },
      ],
    });
    const out = validateExtraction(' \t\n ', extraction);
    expect(out.domainStatus).toBe('UNRELIABLE');
    expect(out.confidence).toBe(0);
    expect(out.evidence).toHaveLength(0);
    expect(out.signals['ambition']).toBeNull();
  });

  it('removes signal when quote is paraphrase (not substring of originalText)', () => {
    const extraction = baseSelf({
      signals: { ambition: 6, emotionalDepth: 5, directness: 6 },
      evidence: [
        {
          signal: 'ambition',
          quote: 'User enjoys weekend leisure activities',
          reason: 'Paraphrase supports ambition',
        },
        {
          signal: 'emotionalDepth',
          quote: 'slow Sundays',
          reason: 'Phrase shows emotional tone',
        },
        {
          signal: 'directness',
          quote: 'slow Sundays',
          reason: 'Weekend lifestyle cue',
        },
      ],
    });
    const out = validateExtraction(text, extraction);
    expect(out.signals['ambition']).toBeNull();
    expect(out.signals['emotionalDepth']).toBe(5);
    expect(out.signals['directness']).toBe(6);
    expect(out.evidence.map((e) => e.signal)).toContain('emotionalDepth');
    expect(out.evidence.map((e) => e.signal)).toContain('directness');
    expect(out.domainStatus).toBe('OK');
  });

  it('keeps signal when quote is exact substring and reason is valid', () => {
    const extraction = baseSelf({
      signals: { ambition: 8, directness: 6 },
      evidence: [
        {
          signal: 'ambition',
          quote: 'slow Sundays',
          reason: 'Mentions relaxed weekend pace',
        },
        {
          signal: 'directness',
          quote: 'slow Sundays',
          reason: 'Direct lifestyle description',
        },
      ],
    });
    const out = validateExtraction(text, extraction);
    expect(out.signals['ambition']).toBe(8);
    expect(out.evidence).toHaveLength(2);
    expect(out.evidence[0].quote).toBe('slow Sundays');
    expect(out.evidence[0].reason).toBe('Mentions relaxed weekend pace');
  });

  it('nullifies signal when quote is valid but reason is missing', () => {
    const extraction = baseSelf({
      signals: { ambition: 8 },
      evidence: [{ signal: 'ambition', quote: 'slow Sundays', reason: '' }],
    });
    const out = validateExtraction(text, extraction);
    expect(out.signals['ambition']).toBeNull();
    expect(out.evidence).toHaveLength(0);
    expect(out.domainStatus).toBe('LOW_DATA');
  });

  it('nullifies signal when reason exceeds max word count', () => {
    const longReason = Array(MAX_EVIDENCE_REASON_WORDS + 1)
      .fill('word')
      .join(' ');
    expect(reasonWordCount(longReason)).toBe(MAX_EVIDENCE_REASON_WORDS + 1);
    expect(reasonMeetsContract(longReason)).toBe(false);
    const extraction = baseSelf({
      signals: { ambition: 8 },
      evidence: [{ signal: 'ambition', quote: 'slow Sundays', reason: longReason }],
    });
    const out = validateExtraction(text, extraction);
    expect(out.signals['ambition']).toBeNull();
    expect(out.evidence).toHaveLength(0);
  });

  it('removes signal when quote contains implies:', () => {
    const extraction = baseSelf({
      signals: { ambition: 7 },
      evidence: [
        {
          signal: 'ambition',
          quote: 'implies: user is driven',
          reason: 'Short reason here',
        },
      ],
    });
    const out = validateExtraction(text, extraction);
    expect(out.signals['ambition']).toBeNull();
    expect(out.evidence).toHaveLength(0);
    expect(out.domainStatus).toBe('LOW_DATA');
    expect(quoteContainsBannedMarkers('IMPLIES: something')).toBe(true);
  });

  it('quoteContainsBannedMarkers is case-insensitive for suggests:', () => {
    expect(quoteContainsBannedMarkers('SUGGESTS: something')).toBe(true);
    expect(quoteContainsBannedMarkers('plain quote')).toBe(false);
  });

  it('quoteIsExactSubstringOf requires exact character match', () => {
    expect(quoteIsExactSubstringOf('slow Sundays', text)).toBe(true);
    expect(quoteIsExactSubstringOf('Slow Sundays', text)).toBe(false);
  });
});
