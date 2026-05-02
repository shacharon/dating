import {
  applyHonestyFraming,
  normalizeDisplay,
} from './evaluate-display-helpers';
import { AnalysisPresentationSchema } from './evaluate-inference-schemas';

describe('evaluate display presentation contract', () => {
  it('normalizes new presentation fields and preserves legacy compatibility', () => {
    const normalized = normalizeDisplay({
      overallNarrative: 'Friendly narrative.',
      aboutMeInsight: 'About me insight.',
      relationshipInsight: 'Relationship insight.',
      partnerInsight: 'Partner insight.',
      missingPrompts: ['Prompt A?', 'Prompt B?'],
    });

    expect(normalized.overallNarrative).toBe('Friendly narrative.');
    expect(normalized.aboutMeInsight).toBe('About me insight.');
    expect(normalized.relationshipInsight).toBe('Relationship insight.');
    expect(normalized.partnerInsight).toBe('Partner insight.');
    expect(normalized.missingPrompts).toEqual(['Prompt A?', 'Prompt B?']);
    expect(normalized.summary).toBe('Friendly narrative.');
    expect(normalized.insight).toBe('Relationship insight.');
  });

  it('accepts legacy summary/insight input and maps to new presentation fields', () => {
    const normalized = normalizeDisplay({
      summary: 'Legacy summary.',
      insight: 'Legacy insight.',
    });

    expect(normalized.overallNarrative).toBe('Legacy summary.');
    expect(normalized.relationshipInsight).toBe('Legacy insight.');
    expect(normalized.summary).toBe('Legacy summary.');
    expect(normalized.insight).toBe('Legacy insight.');
    expect(normalized.missingPrompts.length).toBeGreaterThanOrEqual(2);
  });

  it('applies warm cautious framing without diagnostic language', () => {
    const cautious = applyHonestyFraming(
      normalizeDisplay({
        summary: 'You value closeness.',
        insight: 'You seek emotional clarity.',
      }),
      true,
    );

    expect(cautious.overallNarrative).toMatch(/^Thanks for sharing\./);
    expect(cautious.relationshipInsight).toMatch(
      /^From what you shared so far,/,
    );
    expect(cautious.summary).toMatch(/^Thanks for sharing\./);
    expect(cautious.insight).toMatch(/^From what you shared so far,/);
  });

  it('validates schema for both new and legacy-compatible payloads', () => {
    expect(() =>
      AnalysisPresentationSchema.parse({
        overallNarrative: 'Narrative.',
        aboutMeInsight: 'Me.',
        relationshipInsight: 'Rel.',
        partnerInsight: 'Partner.',
        missingPrompts: ['Q1?', 'Q2?'],
      }),
    ).not.toThrow();

    expect(() =>
      AnalysisPresentationSchema.parse({
        summary: 'Legacy summary.',
        insight: 'Legacy insight.',
      }),
    ).not.toThrow();

    expect(() =>
      AnalysisPresentationSchema.parse({
        aboutMeInsight: 'Missing narrative and relationship fields.',
      }),
    ).toThrow();
  });

  it('enforces missingPrompts contract bounds (2-4 prompts)', () => {
    expect(() =>
      AnalysisPresentationSchema.parse({
        overallNarrative: 'Narrative.',
        relationshipInsight: 'Relationship.',
        missingPrompts: ['Only one'],
      }),
    ).toThrow();

    expect(() =>
      AnalysisPresentationSchema.parse({
        overallNarrative: 'Narrative.',
        relationshipInsight: 'Relationship.',
        missingPrompts: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
      }),
    ).toThrow();

    expect(() =>
      AnalysisPresentationSchema.parse({
        overallNarrative: 'Narrative.',
        relationshipInsight: 'Relationship.',
        missingPrompts: ['Q1', 'Q2', 'Q3'],
      }),
    ).not.toThrow();
  });
});
