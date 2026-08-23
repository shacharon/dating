import {
  MATCH_LIST_RANK_PRESENTATION_VERSION,
  parsePresentationJson,
  toPresentationJson,
} from './match-list-rank-presentation.types';

describe('match-list-rank-presentation.types', () => {
  const explainability = {
    positiveChips: ['Ambition alignment'],
    reasonShort: 'Strong alignment on ambition',
  };
  const recommendation = {
    explainability,
    primaryTakeaway: 'Strong match',
    suggestedNextAction: 'Start a conversation',
  };

  it('toPresentationJson / parsePresentationJson round-trip', () => {
    const raw = toPresentationJson({
      explainability,
      recommendation,
    });

    expect(parsePresentationJson(raw)).toEqual(raw);
  });

  it('toPresentationJson includes hardBlockedDetail when set', () => {
    const hardBlocked = {
      disabled: true,
      reasons: [{ dimension: 'smoking', direction: 'viewer_to_them' as const }],
    };
    const raw = toPresentationJson({
      explainability,
      recommendation,
      hardBlocked,
    });

    expect(raw.hardBlockedDetail).toEqual(hardBlocked);
    expect(parsePresentationJson(raw)?.hardBlockedDetail).toEqual(hardBlocked);
  });

  it('parsePresentationJson returns null for version mismatch', () => {
    expect(
      parsePresentationJson({
        v: MATCH_LIST_RANK_PRESENTATION_VERSION + 1,
        explainability,
        recommendation,
      }),
    ).toBeNull();
  });

  it('parsePresentationJson returns null for invalid payload', () => {
    expect(parsePresentationJson(null)).toBeNull();
    expect(parsePresentationJson('x')).toBeNull();
    expect(parsePresentationJson({ v: 1 })).toBeNull();
  });
});
