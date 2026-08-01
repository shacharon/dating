import { DATING_POLICY_CATEGORY } from './content-moderation.types';
import { findDatingBlocklistHit } from './dating-policy';
import { buildModerationUserFacingDetails } from './moderation-user-facing';

describe('findDatingBlocklistHit', () => {
  it('returns matched span and index', () => {
    const hit = findDatingBlocklistHit('please send nudes now');
    expect(hit).toEqual({
      matchedText: 'send nudes',
      index: 7,
      length: 'send nudes'.length,
      patternSource: expect.stringContaining('nudes'),
    });
  });

  it('returns null for clean text', () => {
    expect(findDatingBlocklistHit('hello how are you')).toBeNull();
  });
});

describe('buildModerationUserFacingDetails', () => {
  it('uses blocklist matched span and fuck-family copy', () => {
    const details = buildModerationUserFacingDetails({
      text: 'hey wanna fuck tonight',
      decision: {
        allow: false,
        source: 'dating_blocklist',
        category: DATING_POLICY_CATEGORY,
        score: null,
        action: 'blocked',
      },
      surface: 'message',
    });
    expect(details.flaggedText.toLowerCase()).toBe('wanna fuck');
    expect(details.flaggedTextIndex).toBeGreaterThanOrEqual(0);
    expect(details.flaggedTextLength).toBe(details.flaggedText.length);
    expect(details.reason).toBe('Direct sexual solicitation');
    expect(details.exampleAlternative).toContain('adventurous');
    expect(details).not.toHaveProperty('score');
  });

  it('maps openai harassment category', () => {
    const details = buildModerationUserFacingDetails({
      text: 'bad stuff',
      decision: {
        allow: false,
        source: 'openai',
        category: 'harassment',
        score: 0.9,
        action: 'blocked',
      },
      surface: 'profile',
    });
    expect(details).toMatchObject({
      flaggedText: 'bad stuff',
      flaggedTextIndex: 0,
      flaggedTextLength: 'bad stuff'.length,
      reason: 'Contains harassing or bullying language',
    });
    expect(details.exampleAlternative).toBeUndefined();
  });

  it('uses dating_score copy with full text span', () => {
    const details = buildModerationUserFacingDetails({
      text: 'suggestive paraphrase',
      decision: {
        allow: false,
        source: 'dating_score',
        category: DATING_POLICY_CATEGORY,
        score: 0.9,
        action: 'blocked',
      },
      surface: 'profile',
    });
    expect(details).toMatchObject({
      flaggedText: 'suggestive paraphrase',
      flaggedTextIndex: 0,
      reason: 'Content looks like a sexual solicitation',
      exampleAlternative: expect.stringContaining('genuine connection'),
    });
  });
});
