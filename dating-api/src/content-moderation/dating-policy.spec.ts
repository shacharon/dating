import {
  DATING_POLICY_CATEGORY,
  DATING_POLICY_SEXUAL_SCORE_MIN_DEFAULT,
  datingPolicySexualScoreMin,
  isDatingPolicyEnabled,
  type ModerationResult,
} from './content-moderation.types';
import {
  evaluateContentPolicy,
  findDatingBlocklistHit,
  isDatingPolicyNearMiss,
  matchesDatingBlocklist,
} from './dating-policy';

function clean(
  overrides: Partial<ModerationResult> = {},
): ModerationResult {
  return {
    flagged: false,
    categories: [],
    primaryCategory: null,
    score: 0,
    sexualScore: null,
    failOpen: false,
    ...overrides,
  };
}

describe('isDatingPolicyEnabled', () => {
  it('defaults to true when unset', () => {
    expect(isDatingPolicyEnabled({})).toBe(true);
  });

  it('treats false/0/off/no as disabled', () => {
    expect(isDatingPolicyEnabled({ DATING_POLICY_ENABLED: 'false' })).toBe(
      false,
    );
    expect(isDatingPolicyEnabled({ DATING_POLICY_ENABLED: '0' })).toBe(false);
  });
});

describe('datingPolicySexualScoreMin', () => {
  it('defaults to 0.85', () => {
    expect(datingPolicySexualScoreMin({})).toBe(
      DATING_POLICY_SEXUAL_SCORE_MIN_DEFAULT,
    );
  });

  it('falls back on invalid values', () => {
    expect(
      datingPolicySexualScoreMin({ DATING_POLICY_SEXUAL_SCORE_MIN: 'nope' }),
    ).toBe(DATING_POLICY_SEXUAL_SCORE_MIN_DEFAULT);
  });
});

describe('matchesDatingBlocklist', () => {
  it('matches known solicit phrases', () => {
    expect(matchesDatingBlocklist('I want to fuck')).toBe(true);
    expect(matchesDatingBlocklist('wanna fuck tonight')).toBe(true);
    expect(matchesDatingBlocklist('please send nudes')).toBe(true);
  });

  it('does not match clean text', () => {
    expect(matchesDatingBlocklist('hello how are you')).toBe(false);
  });
});

describe('findDatingBlocklistHit', () => {
  it('returns span for known solicit phrase', () => {
    const hit = findDatingBlocklistHit('I want to fuck');
    expect(hit?.matchedText.toLowerCase()).toContain('fuck');
    expect(hit?.index).toBe(0);
  });
});

describe('evaluateContentPolicy', () => {
  const envOn = { DATING_POLICY_ENABLED: 'true' };

  it('allows clean text', () => {
    expect(evaluateContentPolicy('hello', clean(), envOn)).toEqual({
      allow: true,
    });
  });

  it('rejects OpenAI flagged first', () => {
    const decision = evaluateContentPolicy(
      'anything',
      clean({
        flagged: true,
        categories: ['hate'],
        primaryCategory: 'hate',
        score: 0.9,
        sexualScore: 0.1,
      }),
      envOn,
    );
    expect(decision).toMatchObject({
      allow: false,
      source: 'openai',
      category: 'hate',
      action: 'blocked',
    });
  });

  it('rejects blocklist hit with dating_policy', () => {
    const decision = evaluateContentPolicy(
      'i want to fuck',
      clean({ sexualScore: 0.2 }),
      envOn,
    );
    expect(decision).toMatchObject({
      allow: false,
      source: 'dating_blocklist',
      category: DATING_POLICY_CATEGORY,
      action: 'blocked',
    });
  });

  it('rejects high sexual score when not flagged', () => {
    const decision = evaluateContentPolicy(
      'suggestive paraphrase',
      clean({ sexualScore: 0.9 }),
      envOn,
    );
    expect(decision).toMatchObject({
      allow: false,
      source: 'dating_score',
      category: DATING_POLICY_CATEGORY,
      score: 0.9,
    });
  });

  it('blocklist still applies on fail-open', () => {
    const decision = evaluateContentPolicy(
      'wanna fuck',
      clean({ failOpen: true, sexualScore: null }),
      envOn,
    );
    expect(decision).toMatchObject({
      allow: false,
      source: 'dating_blocklist',
      score: null,
    });
  });

  it('does not score-block on fail-open even with high sexualScore', () => {
    const decision = evaluateContentPolicy(
      'clean enough',
      clean({ failOpen: true, sexualScore: 0.99 }),
      envOn,
    );
    expect(decision).toEqual({ allow: true });
  });

  it('skips dating rules when policy disabled', () => {
    const decision = evaluateContentPolicy(
      'i want to fuck',
      clean(),
      { DATING_POLICY_ENABLED: 'false' },
    );
    expect(decision).toEqual({ allow: true });
  });
});

describe('isDatingPolicyNearMiss', () => {
  it('detects elevated sexual score under threshold', () => {
    expect(
      isDatingPolicyNearMiss(
        'borderline',
        clean({ sexualScore: 0.6 }),
        { DATING_POLICY_ENABLED: 'true' },
      ),
    ).toBe(true);
  });

  it('false when at or above threshold (would reject)', () => {
    expect(
      isDatingPolicyNearMiss(
        'borderline',
        clean({ sexualScore: 0.9 }),
        { DATING_POLICY_ENABLED: 'true' },
      ),
    ).toBe(false);
  });
});
