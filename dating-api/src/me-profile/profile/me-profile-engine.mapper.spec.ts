import type { Prisma } from '@prisma/client';
import type { EvaluateBatchResult } from '../../evaluate/evaluate-batch.types';
import {
  assembleEvaluationPayload,
  buildMeMatchesParticipantReadModel,
  buildProfilePayloadFromNewModel,
  meMatchesEngineNormalizedMergeActive,
  resolveMeMatchesEngineInputSourceMode,
  type NormalizedInterestRow,
  type NormalizedSignalRow,
} from './me-profile-engine.mapper';

const baseHgProfile = {
  id: 'prof_rm_1',
  name: 'N',
  aboutMe: 'me',
  aboutPartner: 'p',
  aboutRelationship: 'r',
  gender: 'MALE' as const,
  birthDate: new Date('1990-01-01'),
  desiredPartnerGenders: ['FEMALE'] as unknown as Prisma.JsonValue,
  childrenStatus: null,
  wantsChildren: null,
  smokingFrequency: null,
  alcoholUse: null,
  education: null,
  religion: null,
};

describe('me-profile-engine.mapper', () => {
  describe('buildMeMatchesParticipantReadModel', () => {
    const evaluationJson = {
      self: { signals: { emotionalDepth: 3 } },
      partner: {},
      relationship: {},
    } as unknown as EvaluateBatchResult;
    const evaluation = {
      createdAt: new Date('2026-05-02T12:00:00.000Z'),
      evaluationJson: evaluationJson as unknown as Prisma.JsonValue,
      version: 'v1',
    };

    it('returns enginePayload + hg from UserProfile + preference + latest evaluation only', () => {
      const read = buildMeMatchesParticipantReadModel(
        baseHgProfile,
        {
          partnerAgeMin: 25,
          partnerAgeMax: 40,
          maxDistanceKm: 50,
          acceptedPartnerGenders: ['FEMALE'],
        },
        evaluation,
      );

      expect(read.enginePayload).toEqual(
        buildProfilePayloadFromNewModel(
          {
            id: baseHgProfile.id,
            name: baseHgProfile.name,
            aboutMe: baseHgProfile.aboutMe,
            aboutPartner: baseHgProfile.aboutPartner,
            aboutRelationship: baseHgProfile.aboutRelationship,
          },
          evaluation,
        ),
      );
      expect(read.hg.row.id).toBe(baseHgProfile.id);
      expect(read.hg.fallback).toBeNull();
      expect(read.evaluationDisplaySummary).toBeNull();
    });

    it('reports hg fallback when preference is null (separate from profile row)', () => {
      const read = buildMeMatchesParticipantReadModel(baseHgProfile, null, evaluation);
      expect(read.hg.fallback).toEqual({ reason: 'missing_row' });
      expect(read.evaluationDisplaySummary).toBeNull();
    });

    it('parses evaluationDisplaySummary from display.summary inside the read model', () => {
      const evalWithDisplay = {
        createdAt: new Date('2026-05-02T12:00:00.000Z'),
        version: 'v1',
        evaluationJson: {
          display: { summary: 'Grounded optimist.' },
          self: {},
          partner: {},
          relationship: {},
        } as unknown as Prisma.JsonValue,
      };
      const read = buildMeMatchesParticipantReadModel(baseHgProfile, null, evalWithDisplay);
      expect(read.evaluationDisplaySummary).toBe('Grounded optimist.');
    });

    it('blob-only when useNormalized is false even if normalized rows carry different evalVersion', () => {
      const read = buildMeMatchesParticipantReadModel(
        baseHgProfile,
        null,
        evaluation,
        {
          signals: [
            { signalKey: 'emotionalDepth', signalValue: 99, evalVersion: 'stale' },
          ],
          interests: [],
          useNormalized: false,
        },
      );
      expect((read.enginePayload.evaluation as any).self.signals.emotionalDepth).toBe(3);
    });

    it('merges normalized rows when useNormalized and all evalVersion match evaluation.version', () => {
      const read = buildMeMatchesParticipantReadModel(
        baseHgProfile,
        null,
        evaluation,
        {
          signals: [{ signalKey: 'emotionalDepth', signalValue: 8, evalVersion: 'v1' }],
          interests: [{ tag: 'chess', rank: 0, evalVersion: 'v1' }],
          useNormalized: true,
        },
      );
      expect((read.enginePayload.evaluation as any).self.signals.emotionalDepth).toBe(8);
      expect((read.enginePayload.evaluation as any).enrichment?.signals?.interestsTop3).toEqual([
        'chess',
      ]);
    });

    it('blob-only when useNormalized and a signal evalVersion mismatches (all-or-nothing)', () => {
      const read = buildMeMatchesParticipantReadModel(
        baseHgProfile,
        null,
        evaluation,
        {
          signals: [
            { signalKey: 'emotionalDepth', signalValue: 8, evalVersion: 'v1' },
            { signalKey: 'lifestylePace', signalValue: 7, evalVersion: 'v2' },
          ],
          interests: [],
          useNormalized: true,
        },
      );
      expect((read.enginePayload.evaluation as any).self.signals.emotionalDepth).toBe(3);
    });
  });

  describe('buildProfilePayloadFromNewModel', () => {
    it('feeds compareWithStatus from UserProfileEvaluation.evaluationJson only (no UserProfile interestsTop/sig* dependency)', () => {
      const profile = {
        id: 'prof_engine_1',
        name: 'Test',
        aboutMe: 'me',
        aboutPartner: 'partner',
        aboutRelationship: 'rel',
      };
      const evaluationJson = {
        self: { signals: { emotionalDepth: 9 } },
        partner: {},
        relationship: {},
      } as unknown as EvaluateBatchResult;
      const evaluation = {
        createdAt: new Date('2026-05-02T12:00:00.000Z'),
        evaluationJson: evaluationJson as unknown as Prisma.JsonValue,
        version: 'v1',
      };

      const payload = buildProfilePayloadFromNewModel(profile, evaluation);

      expect(payload.evaluation).toEqual(evaluationJson);
      expect(payload.id).toBe(profile.id);
      expect(payload.evaluationStatus).toBe('DONE');
    });
  });

  describe('assembleEvaluationPayload', () => {
    const evalVersion = 'v1';
    const baseEval = {
      self: { signals: { emotionalDepth: 5, lifestylePace: 3 } },
      partner: {},
      relationship: {},
      enrichment: {
        version: 'v1' as const,
        signals: {
          dailyRhythm: null,
          autonomyTogethernessDepth: null,
          kidsTimeline: null,
          conflictStyleDetail: null,
          interestsTop3: ['hiking', 'coffee', 'travel'],
        },
      },
    } as unknown as EvaluateBatchResult;
    const baseEvalJson = baseEval as unknown as Prisma.JsonValue;

    it('returns evaluationJson unchanged when useNormalized=false', () => {
      const signals: NormalizedSignalRow[] = [
        { signalKey: 'emotionalDepth', signalValue: 9, evalVersion: 'v2' },
      ];
      const interests: NormalizedInterestRow[] = [{ tag: 'yoga', rank: 0, evalVersion: 'v2' }];

      const result = assembleEvaluationPayload(
        baseEvalJson,
        signals,
        interests,
        false,
        evalVersion,
      );

      expect(result).toBe(baseEval);
    });

    it('returns evaluationJson unchanged when both arrays are empty (flag on)', () => {
      const result = assembleEvaluationPayload(baseEvalJson, [], [], evalVersion);

      expect(result).toBe(baseEval);
    });

    it('overrides self.signals with normalized rows when flag on', () => {
      const signals: NormalizedSignalRow[] = [
        { signalKey: 'emotionalDepth', signalValue: 9, evalVersion },
        { signalKey: 'lifestylePace', signalValue: 7, evalVersion },
      ];

      const result = assembleEvaluationPayload(baseEvalJson, signals, [], evalVersion);

      expect((result.self as any).signals.emotionalDepth).toBe(9);
      expect((result.self as any).signals.lifestylePace).toBe(7);
    });

    it('preserves unrelated self.signals keys not in normalized rows', () => {
      const signals: NormalizedSignalRow[] = [
        { signalKey: 'emotionalDepth', signalValue: 9, evalVersion },
      ];

      const result = assembleEvaluationPayload(baseEvalJson, signals, [], evalVersion);

      // lifestylePace was in base but not in normalized signals — must be preserved
      expect((result.self as any).signals.lifestylePace).toBe(3);
    });

    it('overrides enrichment.signals.interestsTop3 when flag on and interests provided', () => {
      const interests: NormalizedInterestRow[] = [
        { tag: 'yoga', rank: 0, evalVersion },
        { tag: 'cooking', rank: 1, evalVersion },
        { tag: 'climbing', rank: 2, evalVersion },
        { tag: 'gaming', rank: 3, evalVersion }, // rank 4 — should be trimmed to top 3
      ];

      const result = assembleEvaluationPayload(baseEvalJson, [], interests, evalVersion);

      expect(result.enrichment?.signals.interestsTop3).toEqual(['yoga', 'cooking', 'climbing']);
    });

    it('preserves other enrichment.signals fields when overriding interestsTop3', () => {
      const evalWithEnrichment = {
        ...baseEval,
        enrichment: {
          version: 'v1' as const,
          signals: {
            dailyRhythm: 'morning_person' as any,
            autonomyTogethernessDepth: null,
            kidsTimeline: null,
            conflictStyleDetail: null,
            interestsTop3: ['hiking'],
          },
        },
      } as unknown as Prisma.JsonValue;

      const interests: NormalizedInterestRow[] = [{ tag: 'yoga', rank: 0, evalVersion }];

      const result = assembleEvaluationPayload(evalWithEnrichment, [], interests, evalVersion);

      expect(result.enrichment?.signals.dailyRhythm).toBe('morning_person');
      expect(result.enrichment?.signals.interestsTop3).toEqual(['yoga']);
    });

    it('creates enrichment block when base has no enrichment and interests are provided', () => {
      const evalNoEnrichment = {
        self: { signals: { emotionalDepth: 5 } },
        partner: {},
        relationship: {},
      } as unknown as Prisma.JsonValue;

      const interests: NormalizedInterestRow[] = [{ tag: 'yoga', rank: 0, evalVersion }];

      const result = assembleEvaluationPayload(evalNoEnrichment, [], interests, evalVersion);

      expect(result.enrichment?.version).toBe('v1');
      expect(result.enrichment?.signals.interestsTop3).toEqual(['yoga']);
      expect(result.enrichment?.signals.dailyRhythm).toBeNull();
    });

    it('applies both signal and interest overrides in a single call', () => {
      const signals: NormalizedSignalRow[] = [
        { signalKey: 'emotionalDepth', signalValue: 10, evalVersion },
      ];
      const interests: NormalizedInterestRow[] = [
        { tag: 'reading', rank: 0, evalVersion },
        { tag: 'surfing', rank: 1, evalVersion },
      ];

      const result = assembleEvaluationPayload(baseEvalJson, signals, interests, evalVersion);

      expect((result.self as any).signals.emotionalDepth).toBe(10);
      expect(result.enrichment?.signals.interestsTop3).toEqual(['reading', 'surfing']);
    });

    it('does not modify partner / relationship / display fields', () => {
      const evalWithAll = {
        ...baseEval,
        partner: { signals: { emotionalDepth: 2 } },
        display: { summary: 'Grounded.', insight: 'Insight.' },
      } as unknown as Prisma.JsonValue;

      const signals: NormalizedSignalRow[] = [
        { signalKey: 'emotionalDepth', signalValue: 9, evalVersion },
      ];

      const result = assembleEvaluationPayload(evalWithAll, signals, [], evalVersion);

      expect((result.partner as any).signals.emotionalDepth).toBe(2);
      expect(result.display?.summary).toBe('Grounded.');
    });

    it('merges normalized signals and interests when all evalVersion match evaluation', () => {
      const signals: NormalizedSignalRow[] = [
        { signalKey: 'emotionalDepth', signalValue: 8, evalVersion },
      ];
      const interests: NormalizedInterestRow[] = [
        { tag: 'chess', rank: 0, evalVersion },
        { tag: 'swim', rank: 1, evalVersion },
      ];
      const result = assembleEvaluationPayload(baseEvalJson, signals, interests, evalVersion);
      expect((result.self as any).signals.emotionalDepth).toBe(8);
      expect(result.enrichment?.signals.interestsTop3).toEqual(['chess', 'swim']);
    });

    it('ignores normalized signals when any row evalVersion mismatches (blob only)', () => {
      const signals: NormalizedSignalRow[] = [
        { signalKey: 'emotionalDepth', signalValue: 9, evalVersion },
        { signalKey: 'lifestylePace', signalValue: 8, evalVersion: 'v2' },
      ];
      const result = assembleEvaluationPayload(baseEvalJson, signals, [], evalVersion);
      expect(result).toBe(baseEval);
      expect((result.self as any).signals.emotionalDepth).toBe(5);
    });

    it('ignores normalized interests when any row evalVersion mismatches (blob only)', () => {
      const interests: NormalizedInterestRow[] = [
        { tag: 'yoga', rank: 0, evalVersion: 'v2' },
      ];
      const result = assembleEvaluationPayload(baseEvalJson, [], interests, evalVersion);
      expect(result).toBe(baseEval);
      expect(result.enrichment?.signals.interestsTop3).toEqual(['hiking', 'coffee', 'travel']);
    });

    it('all-or-nothing: mismatched interest drops aligned signals too (no partial merge)', () => {
      const signals: NormalizedSignalRow[] = [
        { signalKey: 'emotionalDepth', signalValue: 9, evalVersion },
      ];
      const interests: NormalizedInterestRow[] = [
        { tag: 'yoga', rank: 0, evalVersion },
        { tag: 'bad', rank: 1, evalVersion: 'v2' },
      ];
      const result = assembleEvaluationPayload(baseEvalJson, signals, interests, evalVersion);
      expect(result).toBe(baseEval);
      expect((result.self as any).signals.emotionalDepth).toBe(5);
      expect(result.enrichment?.signals.interestsTop3).toEqual(['hiking', 'coffee', 'travel']);
    });
  });

  describe('meMatchesEngineNormalizedMergeActive', () => {
    const v = 'v1';
    const sig = (ev: string): NormalizedSignalRow[] => [
      { signalKey: 'emotionalDepth', signalValue: 5, evalVersion: ev },
    ];

    it('is true when only signals present and versions align', () => {
      expect(meMatchesEngineNormalizedMergeActive(sig(v), [], v)).toBe(true);
      expect(resolveMeMatchesEngineInputSourceMode(sig(v), [], v)).toBe(
        'normalized',
      );
    });

    it('is false when both normalized arrays are empty', () => {
      expect(meMatchesEngineNormalizedMergeActive([], [], v)).toBe(false);
      expect(resolveMeMatchesEngineInputSourceMode([], [], v)).toBe(
        'evaluationJson',
      );
    });

    it('is false when any evalVersion mismatches evaluationVersion', () => {
      expect(meMatchesEngineNormalizedMergeActive(sig('v2'), [], v)).toBe(
        false,
      );
      expect(resolveMeMatchesEngineInputSourceMode(sig('v2'), [], v)).toBe(
        'evaluationJson',
      );
    });

    it('is true when rows present and all versions align', () => {
      expect(meMatchesEngineNormalizedMergeActive(sig(v), [], v)).toBe(true);
      expect(resolveMeMatchesEngineInputSourceMode(sig(v), [], v)).toBe(
        'normalized',
      );
    });
  });
});

