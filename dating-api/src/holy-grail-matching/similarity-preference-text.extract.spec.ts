import { extractSimilarityPreferenceFromFreeText } from './similarity-preference-text.extract';

describe('extractSimilarityPreferenceFromFreeText', () => {
  it('maps allowlisted similar phrases (EN + HE)', () => {
    expect(
      extractSimilarityPreferenceFromFreeText({
        aboutPartner: 'I want someone similar to me.',
      }).value,
    ).toBe('similar');
    expect(
      extractSimilarityPreferenceFromFreeText({ aboutPartner: 'Looking for the same type of person.' }).value,
    ).toBe('similar');
    expect(extractSimilarityPreferenceFromFreeText({ aboutPartner: 'מחפש מישהו כמוני' }).value).toBe('similar');
    expect(extractSimilarityPreferenceFromFreeText({ aboutPartner: 'דומה לי ברוח' }).value).toBe('similar');
    expect(extractSimilarityPreferenceFromFreeText({ aboutPartner: 'Someone like me.' }).value).toBe('similar');
  });

  it('maps allowlisted different phrases', () => {
    expect(
      extractSimilarityPreferenceFromFreeText({ aboutPartner: 'I want someone different from me.' }).value,
    ).toBe('different');
    expect(
      extractSimilarityPreferenceFromFreeText({ aboutRelationship: 'The opposite of me would be ideal.' }).value,
    ).toBe('different');
    expect(extractSimilarityPreferenceFromFreeText({ aboutPartner: 'מחפש מישהו שונה ממני' }).value).toBe('different');
    expect(extractSimilarityPreferenceFromFreeText({ aboutPartner: 'אנחנו הפכים וזה בסדר' }).value).toBe('different');
  });

  it('maps allowlisted balanced phrases', () => {
    expect(
      extractSimilarityPreferenceFromFreeText({ aboutPartner: 'Not exactly like me — somewhere in the middle.' }).value,
    ).toBe('balanced');
    expect(extractSimilarityPreferenceFromFreeText({ aboutPartner: 'A mix of traits works for me.' }).value).toBe(
      'balanced',
    );
    expect(extractSimilarityPreferenceFromFreeText({ aboutPartner: 'I prefer balanced dynamics.' }).value).toBe(
      'balanced',
    );
  });

  it('returns undefined when no allowlisted evidence', () => {
    expect(
      extractSimilarityPreferenceFromFreeText({
        aboutPartner: 'Kind, funny, likes travel.',
      }).value,
    ).toBeUndefined();
    expect(extractSimilarityPreferenceFromFreeText({ aboutPartner: '' }).value).toBeUndefined();
  });

  it('returns null when two categories match (unclear)', () => {
    expect(
      extractSimilarityPreferenceFromFreeText({
        aboutPartner: 'Someone like me but also different from me.',
      }).value,
    ).toBeNull();
  });

  it('does not treat negated "like me" as similar', () => {
    expect(
      extractSimilarityPreferenceFromFreeText({ aboutPartner: 'Not like me at all.' }).value,
    ).toBeUndefined();
    expect(
      extractSimilarityPreferenceFromFreeText({ aboutPartner: 'Nothing like me.' }).value,
    ).toBeUndefined();
  });

  it('records evidence phrases when matched', () => {
    const r = extractSimilarityPreferenceFromFreeText({ aboutPartner: 'כמוני' });
    expect(r.evidence).toContain('כמוני');
  });
});
