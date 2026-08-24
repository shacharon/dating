import {
  validateExtraction,
  quoteContainsBannedMarkers,
  quoteIsExactSubstringOf,
  reasonMeetsContract,
  reasonWordCount,
  MAX_EVIDENCE_REASON_WORDS,
} from './extraction-strict-validation';
import { EXTRACTION_SIGNAL_KEYS, type ExtractedSignals } from '../extracted-signals.interface';

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

  it('keeps signal when quote contains inferred: invalid evidence row is dropped only', () => {
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
    expect(out.signals['ambition']).toBe(7);
    expect(out.evidence).toHaveLength(0);
  });

  it('whitespace-only input: keeps LLM signals; drops evidence that fails substring check', () => {
    const extraction = baseSelf({
      signals: { ambition: 8, directness: 6 },
      evidence: [
        { signal: 'ambition', quote: 'slow Sundays', reason: 'Valid reason here' },
        { signal: 'directness', quote: 'slow Sundays', reason: 'Also valid' },
      ],
    });
    const out = validateExtraction(' \t\n ', extraction);
    expect(out.signals['ambition']).toBe(8);
    expect(out.signals['directness']).toBe(6);
    expect(out.confidence).toBe(0.8);
    expect(out.evidence).toHaveLength(0);
  });

  it('keeps signal when quote is paraphrase; drops only invalid evidence rows', () => {
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
    expect(out.signals['ambition']).toBe(6);
    expect(out.signals['emotionalDepth']).toBe(5);
    expect(out.signals['directness']).toBe(6);
    expect(out.evidence.map((e) => e.signal)).toContain('emotionalDepth');
    expect(out.evidence.map((e) => e.signal)).toContain('directness');
    expect(out.evidence.map((e) => e.signal)).not.toContain('ambition');
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

  it('keeps signal when reason is missing; drops invalid evidence row', () => {
    const extraction = baseSelf({
      signals: { ambition: 8 },
      evidence: [{ signal: 'ambition', quote: 'slow Sundays', reason: '' }],
    });
    const out = validateExtraction(text, extraction);
    expect(out.signals['ambition']).toBe(8);
    expect(out.evidence).toHaveLength(0);
  });

  it('keeps signal when reason exceeds max word count; drops evidence row', () => {
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
    expect(out.signals['ambition']).toBe(8);
    expect(out.evidence).toHaveLength(0);
  });

  it('keeps signal when quote contains implies: evidence dropped only', () => {
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
    expect(out.signals['ambition']).toBe(7);
    expect(out.evidence).toHaveLength(0);
    expect(quoteContainsBannedMarkers('IMPLIES: something')).toBe(true);
  });

  it('emits debug payload with droppedEvidenceRows', () => {
    const extraction = baseSelf({
      signals: { ambition: 8 },
      evidence: [
        { signal: 'ambition', quote: 'slow Sundays', reason: 'ok' },
        { signal: 'ambition', quote: 'bad paraphrase', reason: 'ok' },
      ],
    });
    const dbg = jest.fn();
    validateExtraction(text, extraction, dbg);
    expect(dbg).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'validateExtraction',
        droppedEvidenceRows: 1,
        signalsDroppedForEvidenceMismatch: 0,
      }),
    );
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
