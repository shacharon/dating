import { Test } from '@nestjs/testing';
import {
  AcceptedPartnerGender,
  GenderIdentity,
} from '../../canonical/matching-canonical.types';
import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import { HolyGrailRetrievalService } from './holy-grail-retrieval.service';
import { mapHolyGrailRetrievalResponseToWireDto } from './holy-grail-retrieval-wire.dto';
import { buildHolyGrailProfileMappingInputFromDbRow } from './holy-grail-structured-db-json';
import {
  HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY,
  type HolyGrailProfileSourceRepository,
} from './holy-grail-profile-source.repository';

const AT = new Date('2020-06-15T12:00:00.000Z');

class MockRepo implements HolyGrailProfileSourceRepository {
  searcher: HolyGrailProfileMappingInput | null = null;
  candidates: HolyGrailProfileMappingInput[] = [];

  async getMappingInputByProfileId(profileId: string): Promise<HolyGrailProfileMappingInput | null> {
    if (this.searcher && this.searcher.profileId === profileId) {
      return this.searcher;
    }
    return null;
  }

  async listCandidateMappingInputs(): Promise<readonly HolyGrailProfileMappingInput[]> {
    return this.candidates;
  }
}

describe('HolyGrailRetrievalService', () => {
  let service: HolyGrailRetrievalService;
  let repo: MockRepo;

  beforeEach(async () => {
    repo = new MockRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        HolyGrailRetrievalService,
        { provide: HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY, useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(HolyGrailRetrievalService);
  });

  it('never ranks the searcher as a candidate (pool excludes self via repository)', async () => {
    repo.searcher = { profileId: 'searcher' };
    repo.candidates = [
      { profileId: 'a', extractionArrays: { interests_self: ['x'] } },
      { profileId: 'b' },
    ];
    const r = await service.retrieveRankedCandidates({
      searcherProfileId: 'searcher',
      evaluatedAt: AT,
    });
    const ids = r.rankedCandidates.map((x) => x.candidate.profileId);
    expect(ids).not.toContain('searcher');
    expect(r.debug.retrieved).toBe(2);
    expect(r.debug.canonicalMapFailed).toBe(0);
  });

  it('removes candidates blocked by hard eligibility in either direction', async () => {
    repo.searcher = {
      profileId: 's',
      structuredPreferences: { acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE] },
    };
    repo.candidates = [
      { profileId: 'male', structuredFacts: { genderIdentity: GenderIdentity.MALE } },
      { profileId: 'female', structuredFacts: { genderIdentity: GenderIdentity.FEMALE } },
    ];
    const r = await service.retrieveRankedCandidates({
      searcherProfileId: 's',
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates.map((x) => x.candidate.profileId)).toEqual(['female']);
    expect(r.debug.passedHardFilter).toBe(1);
    expect(r.debug.ranked).toBe(1);
    expect(r.debug.canonicalMapFailed).toBe(0);
  });

  it('integration: DB-shaped JSON (via row builder) blocks by hard eligibility and still ranks survivors', async () => {
    repo.searcher = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: 's',
      extractionV2: {
        interests_self: ['books'],
        interests: [],
        lifestyleTraits: [],
      },
      holyGrailStructuredFacts: null,
      holyGrailStructuredPreferences: { acceptedPartnerGenders: ['FEMALE'] },
    });
    repo.candidates = [
      buildHolyGrailProfileMappingInputFromDbRow({
        profileId: 'm',
        extractionV2: null,
        holyGrailStructuredFacts: { genderIdentity: 'MALE' },
        holyGrailStructuredPreferences: null,
      }),
      buildHolyGrailProfileMappingInputFromDbRow({
        profileId: 'f',
        extractionV2: {
          interests_self: ['books', 'hiking'],
          interests: [],
          lifestyleTraits: [],
        },
        holyGrailStructuredFacts: { genderIdentity: 'FEMALE' },
        holyGrailStructuredPreferences: null,
      }),
    ];
    const r = await service.retrieveRankedCandidates({
      searcherProfileId: 's',
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates.map((x) => x.candidate.profileId)).toEqual(['f']);
    expect(r.rankedCandidates[0].rankScore).toBeGreaterThan(0);
    expect(r.debug.passedHardFilter).toBe(1);
    expect(r.debug.canonicalMapFailed).toBe(0);
  });

  it('wire DTO exposes similarityPreference on ranked candidate preferences when stored', async () => {
    repo.searcher = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: 's',
      extractionV2: { interests_self: ['x'], interests: [], lifestyleTraits: [] },
      holyGrailStructuredFacts: null,
      holyGrailStructuredPreferences: { acceptedPartnerGenders: ['FEMALE'] },
    });
    repo.candidates = [
      buildHolyGrailProfileMappingInputFromDbRow({
        profileId: 'f',
        extractionV2: { interests_self: ['x'], interests: [], lifestyleTraits: [] },
        holyGrailStructuredFacts: { genderIdentity: 'FEMALE' },
        holyGrailStructuredPreferences: { similarityPreference: 'different' },
      }),
    ];
    const r = await service.retrieveRankedCandidates({
      searcherProfileId: 's',
      evaluatedAt: AT,
    });
    const w = mapHolyGrailRetrievalResponseToWireDto(r);
    expect(w.rankedCandidates[0].candidate.preferences.similarityPreference).toBe('different');
  });

  it('orders surviving candidates by current ranker (e.g. shared interests)', async () => {
    repo.searcher = {
      profileId: 's',
      extractionArrays: { interests_self: ['books', 'hiking'] },
    };
    repo.candidates = [
      { profileId: 'low', extractionArrays: { interests_self: ['cooking'] } },
      { profileId: 'high', extractionArrays: { interests_self: ['books', 'hiking', 'yoga'] } },
    ];
    const r = await service.retrieveRankedCandidates({
      searcherProfileId: 's',
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates.map((x) => x.candidate.profileId)).toEqual(['high', 'low']);
    expect(r.rankedCandidates[0].rankScore).toBeGreaterThanOrEqual(r.rankedCandidates[1].rankScore);
  });
});
