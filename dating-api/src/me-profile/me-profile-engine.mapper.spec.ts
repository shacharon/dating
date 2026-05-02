import type { Prisma } from '@prisma/client';
import type { EvaluateBatchResult } from '../evaluate/evaluate-batch.types';
import {
  buildMeMatchesParticipantReadModel,
  buildProfilePayloadFromNewModel,
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
    };

    it('returns enginePayload + hg from UserProfile + preference + latest evaluation only', () => {
      const read = buildMeMatchesParticipantReadModel(
        baseHgProfile,
        {
          partnerAgeMin: 25,
          partnerAgeMax: 40,
          maxDistanceKm: 50,
          minimumPartnerEducation: null,
          acceptedPartnerGenders: ['FEMALE'],
          acceptedPartnerSmoking: [],
          acceptedPartnerAlcohol: [],
          acceptedPartnerReligions: [],
          partnerWantsChildren: null,
          partnerHasChildren: null,
          similarityPreference: null,
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
      };

      const payload = buildProfilePayloadFromNewModel(profile, evaluation);

      expect(payload.evaluation).toEqual(evaluationJson);
      expect(payload.id).toBe(profile.id);
      expect(payload.evaluationStatus).toBe('DONE');
    });
  });
});
