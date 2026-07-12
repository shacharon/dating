import {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
  isNegatedBefore,
} from './dealbreaker-signals-text.extract';
import {
  ALL_DEALBREAKER_TAGS,
  DEALBREAKER_ALIAS_TO_BASE,
  DEALBREAKER_TAG_SET,
  DEALBREAKER_TAGS,
  DEALBREAKER_TAXONOMY_VERSION,
  isDealbreakerTag,
} from './dealbreaker-taxonomy';

function signalsOf(text: string) {
  return extractDealbreakerSignalsFromFreeText({
    aboutMe: text,
    aboutPartner: '',
    aboutRelationship: '',
  }).signals;
}

function signalFor(text: string, tag: string) {
  return signalsOf(text).find((s) => s.tag === tag);
}

describe('dealbreaker-taxonomy', () => {
  it('is versioned and closed', () => {
    expect(DEALBREAKER_TAXONOMY_VERSION).toBe('v1');
    expect(DEALBREAKER_TAG_SET.size).toBe(ALL_DEALBREAKER_TAGS.length);
    expect(isDealbreakerTag('smoking')).toBe(true);
    expect(isDealbreakerTag('not_a_real_tag')).toBe(false);
    expect(DEALBREAKER_TAGS.behavioral).toContain('only_non_smokers');
    expect(DEALBREAKER_TAGS.behavioral).toContain('only_smokers');
  });

  it('alias map keys are in the closed set and point at base tags', () => {
    for (const [alias, mapped] of Object.entries(DEALBREAKER_ALIAS_TO_BASE)) {
      expect(isDealbreakerTag(alias)).toBe(true);
      expect(isDealbreakerTag(mapped!.base)).toBe(true);
      expect(['HARD_EXCLUDE', 'HARD_REQUIRE']).toContain(mapped!.classification);
    }
  });
});

describe('extractDealbreakerSignalsFromFreeText — story AC smoking examples', () => {
  it('"I smoke" → no DealbreakerSignal (self-fact only)', () => {
    expect(signalsOf('I smoke')).toEqual([]);
    const hints = extractSelfFactHintsFromFreeText({ aboutMe: 'I smoke' });
    expect(hints).toEqual([
      expect.objectContaining({
        field: 'smokingFrequency',
        value: 'REGULAR',
        evidence: 'I smoke',
      }),
    ]);
  });

  it('"I don\'t want smokers" → smoking HARD_EXCLUDE', () => {
    const s = signalFor("I don't want smokers", 'smoking');
    expect(s).toMatchObject({
      tag: 'smoking',
      classification: 'HARD_EXCLUDE',
    });
    expect(s!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('"I don\'t care about smoking" → smoking SOFT', () => {
    expect(signalFor("I don't care about smoking", 'smoking')).toMatchObject({
      tag: 'smoking',
      classification: 'SOFT',
    });
  });

  it('"Only smokers" / "must be a smoker" → smoking HARD_REQUIRE', () => {
    expect(signalFor('Only smokers', 'smoking')).toMatchObject({
      tag: 'smoking',
      classification: 'HARD_REQUIRE',
    });
    expect(signalFor('must be a smoker', 'smoking')).toMatchObject({
      tag: 'smoking',
      classification: 'HARD_REQUIRE',
    });
  });

  it('only non-smokers alias normalizes to smoking HARD_EXCLUDE', () => {
    expect(signalFor('only non-smokers', 'smoking')).toMatchObject({
      tag: 'smoking',
      classification: 'HARD_EXCLUDE',
    });
    expect(signalsOf('only non-smokers').some((s) => s.tag === 'only_non_smokers')).toBe(
      false,
    );
  });
});

describe('extractDealbreakerSignalsFromFreeText — table-driven families', () => {
  const cases: Array<{
    family: string;
    text: string;
    tag: string;
    classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE' | 'SOFT';
  }> = [
    // behavioral
    {
      family: 'smoking',
      text: "won't date smokers",
      tag: 'smoking',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'smoking',
      text: 'prefer not smokers',
      tag: 'smoking',
      classification: 'SOFT',
    },
    {
      family: 'drugs',
      text: 'no drugs — dealbreaker',
      tag: 'drugs',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'drugs',
      text: "don't care about drugs",
      tag: 'drugs',
      classification: 'SOFT',
    },
    {
      family: 'drugs',
      text: 'only people who use drugs',
      tag: 'drugs',
      classification: 'HARD_REQUIRE',
    },
    {
      family: 'drinking',
      text: "don't want drinkers",
      tag: 'excessive_drinking',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'drinking',
      text: 'only drinkers',
      tag: 'excessive_drinking',
      classification: 'HARD_REQUIRE',
    },
    {
      family: 'drinking',
      text: "don't care about drinking",
      tag: 'excessive_drinking',
      classification: 'SOFT',
    },
    {
      family: 'vaping',
      text: 'no vaping',
      tag: 'vaping',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'vaping',
      text: 'only vapers',
      tag: 'vaping',
      classification: 'HARD_REQUIRE',
    },
    {
      family: 'vaping',
      text: "don't care about vaping",
      tag: 'vaping',
      classification: 'SOFT',
    },
    // lifestyle
    {
      family: 'kids',
      text: "won't date anyone with kids",
      tag: 'no_kids',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'kids',
      text: 'must want kids',
      tag: 'kids_required',
      classification: 'HARD_REQUIRE',
    },
    {
      family: 'kids',
      text: "don't care about kids",
      tag: 'no_kids',
      classification: 'SOFT',
    },
    {
      family: 'pets',
      text: 'no pets',
      tag: 'no_pets',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'pets',
      text: 'must have pets',
      tag: 'pets_required',
      classification: 'HARD_REQUIRE',
    },
    {
      family: 'pets',
      text: "don't care about pets",
      tag: 'no_pets',
      classification: 'SOFT',
    },
    {
      family: 'remote',
      text: 'no remote work',
      tag: 'no_remote_work',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'local',
      text: 'must be local',
      tag: 'must_be_local',
      classification: 'HARD_REQUIRE',
    },
    {
      family: 'local',
      text: 'prefer local',
      tag: 'must_be_local',
      classification: 'SOFT',
    },
    {
      family: 'ldr',
      text: 'no long distance',
      tag: 'long_distance_impossible',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'ldr',
      text: 'prefer not long distance',
      tag: 'long_distance_impossible',
      classification: 'SOFT',
    },
    // values (exclude-only)
    {
      family: 'politics',
      text: 'politics is a dealbreaker',
      tag: 'political_incompatibility',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'politics',
      text: "don't care about politics",
      tag: 'political_incompatibility',
      classification: 'SOFT',
    },
    {
      family: 'religion',
      text: 'religion dealbreaker for me',
      tag: 'religious_incompatibility',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'religion',
      text: "don't care about religion",
      tag: 'religious_incompatibility',
      classification: 'SOFT',
    },
    {
      family: 'morals',
      text: "don't want someone with different values",
      tag: 'moral_incompatibility',
      classification: 'HARD_EXCLUDE',
    },
    // social (exclude-only)
    {
      family: 'jealousy',
      text: "don't want someone jealous",
      tag: 'jealousy',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'jealousy',
      text: 'prefer not jealous',
      tag: 'jealousy',
      classification: 'SOFT',
    },
    {
      family: 'control',
      text: 'no controlling',
      tag: 'control',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'clingy',
      text: 'clingy is a dealbreaker',
      tag: 'clingy',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'drama',
      text: 'no drama',
      tag: 'drama',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'emotional_unavailability',
      text: "don't want someone emotionally unavailable",
      tag: 'emotional_unavailability',
      classification: 'HARD_EXCLUDE',
    },
    {
      family: 'commitment_phobic',
      text: 'commitment phobic dealbreaker',
      tag: 'commitment_phobic',
      classification: 'HARD_EXCLUDE',
    },
  ];

  it.each(cases)(
    '$family: "$text" → $tag $classification',
    ({ text, tag, classification }) => {
      expect(signalFor(text, tag)).toMatchObject({ tag, classification });
    },
  );
});

describe('negation + context disambiguation', () => {
  it('isNegatedBefore detects lightweight not-scope', () => {
    const s = 'not a smoker here';
    const idx = s.indexOf('smoker');
    expect(isNegatedBefore(s, idx)).toBe(true);
  });

  it('smoke detector context does not fire HARD_EXCLUDE alone', () => {
    expect(signalsOf('I installed a smoke detector yesterday')).toEqual([]);
  });

  it('smoked salmon context does not fire smoking preference', () => {
    expect(signalsOf('I love smoked salmon')).toEqual([]);
  });

  it('self-fact "I don\'t want kids" is not a partner no_kids dealbreaker', () => {
    expect(signalFor("I don't want kids", 'no_kids')).toBeUndefined();
    const hints = extractSelfFactHintsFromFreeText({
      aboutMe: "I don't want kids",
    });
    expect(hints).toEqual([
      expect.objectContaining({
        field: 'wantsChildren',
        value: 'NO',
      }),
    ]);
  });

  it('values/social never emit HARD_REQUIRE', () => {
    for (const text of [
      'only jealous people',
      'must be dramatic',
      'only controlling partners',
    ]) {
      const signals = signalsOf(text);
      expect(signals.every((s) => s.classification !== 'HARD_REQUIRE')).toBe(
        true,
      );
    }
  });
});

describe('determinism + empty input', () => {
  it('same input → same output', () => {
    const input = {
      aboutMe: '',
      aboutPartner: "I don't want smokers",
      aboutRelationship: '',
    };
    expect(extractDealbreakerSignalsFromFreeText(input)).toEqual(
      extractDealbreakerSignalsFromFreeText(input),
    );
  });

  it('empty fields → empty signals', () => {
    expect(
      extractDealbreakerSignalsFromFreeText({
        aboutMe: null,
        aboutPartner: undefined,
        aboutRelationship: '',
      }),
    ).toEqual({ version: 'v1', signals: [] });
  });

  it('reads aboutPartner / aboutRelationship (not only aboutMe)', () => {
    expect(
      extractDealbreakerSignalsFromFreeText({
        aboutMe: '',
        aboutPartner: "I don't want smokers",
        aboutRelationship: '',
      }).signals,
    ).toEqual([
      expect.objectContaining({ tag: 'smoking', classification: 'HARD_EXCLUDE' }),
    ]);
    expect(
      extractDealbreakerSignalsFromFreeText({
        aboutMe: '',
        aboutPartner: '',
        aboutRelationship: 'must want kids',
      }).signals,
    ).toEqual([
      expect.objectContaining({
        tag: 'kids_required',
        classification: 'HARD_REQUIRE',
      }),
    ]);
  });

  it('"must drink coffee" does not HARD_REQUIRE drinkers', () => {
    expect(signalsOf('I must drink coffee every morning')).toEqual([]);
  });
});
