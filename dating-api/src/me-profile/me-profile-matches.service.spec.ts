import { NotFoundException } from '@nestjs/common';
import type { UserProfileStatus } from '@prisma/client';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import { MeProfileMatchesService } from './me-profile-matches.service';
import type { IUserProfileRepository } from './repositories/user-profile.repository';

function makeProfileRow(overrides: {
  id: string;
  userId?: string;
  gender?: string | null;
  desiredPartnerGenders?: unknown;
  evaluationCount?: number;
}) {
  return {
    id: overrides.id,
    userId: overrides.userId ?? `user_${overrides.id}`,
    status: 'ANALYZED' as UserProfileStatus,
    birthDate: new Date('1990-06-15T00:00:00.000Z'),
    gender: overrides.gender ?? null,
    desiredPartnerGenders: overrides.desiredPartnerGenders ?? null,
    city: 'TLV',
    country: 'IL',
    locationLabel: 'Tel Aviv, IL',
    aboutMe: 'About me',
    aboutPartner: 'About partner',
    aboutRelationship: 'About relationship',
    analyzedAt: new Date('2026-04-01T10:00:00.000Z'),
    _count: { evaluations: overrides.evaluationCount ?? 1 },
    photos: [] as Array<{ id: string; isPrimary: boolean }>,
  };
}

describe('MeProfileMatchesService', () => {
  const viewerUserId = 'user_viewer';
  const viewer = makeProfileRow({
    id: 'prof_viewer',
    userId: viewerUserId,
    gender: 'MALE',
    desiredPartnerGenders: ['FEMALE'],
  });
  let profiles: jest.Mocked<
    Pick<
      IUserProfileRepository,
      | 'findLegacyProfileMatchesViewer'
      | 'listLegacyAnalyzedCandidatesExcludingUser'
    >
  >;
  let service: MeProfileMatchesService;

  beforeEach(() => {
    profiles = {
      findLegacyProfileMatchesViewer: jest.fn(),
      listLegacyAnalyzedCandidatesExcludingUser: jest
        .fn()
        .mockResolvedValue([]),
    };
    service = new MeProfileMatchesService(
      profiles as unknown as IUserProfileRepository,
      {
        trace: jest.fn(),
        error: jest.fn(),
      } as unknown as StructuredObservabilityService,
    );
  });

  it('throws when the viewer has no profile', async () => {
    profiles.findLegacyProfileMatchesViewer.mockResolvedValue(null);

    await expect(
      service.getMatchesForUser(viewerUserId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      profiles.listLegacyAnalyzedCandidatesExcludingUser,
    ).not.toHaveBeenCalled();
  });

  it('returns an empty candidate list through repository ports', async () => {
    profiles.findLegacyProfileMatchesViewer.mockResolvedValue(viewer as never);

    await expect(service.getMatchesForUser(viewerUserId)).resolves.toEqual({
      viewerProfileId: viewer.id,
      viewerGender: 'MALE',
      viewerAcceptedPartnerGenders: ['FEMALE'],
      totalCandidatesBeforeFilter: 0,
      candidates: [],
    });
    expect(
      profiles.listLegacyAnalyzedCandidatesExcludingUser,
    ).toHaveBeenCalledWith(viewerUserId);
  });

  it('applies reciprocal gender eligibility', async () => {
    profiles.findLegacyProfileMatchesViewer.mockResolvedValue(viewer as never);
    profiles.listLegacyAnalyzedCandidatesExcludingUser.mockResolvedValue([
      makeProfileRow({
        id: 'accepted',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      }),
      makeProfileRow({
        id: 'rejected_by_viewer',
        gender: 'MALE',
        desiredPartnerGenders: null,
      }),
      makeProfileRow({
        id: 'rejects_viewer',
        gender: 'FEMALE',
        desiredPartnerGenders: ['FEMALE'],
      }),
    ] as never);

    const result = await service.getMatchesForUser(viewerUserId);

    expect(result.totalCandidatesBeforeFilter).toBe(3);
    expect(
      result.candidates.map((candidate) => candidate.userProfileId),
    ).toEqual(['accepted']);
  });

  it('maps evaluation and approved photo fields without changing response shape', async () => {
    profiles.findLegacyProfileMatchesViewer.mockResolvedValue(viewer as never);
    profiles.listLegacyAnalyzedCandidatesExcludingUser.mockResolvedValue([
      {
        ...makeProfileRow({
          id: 'candidate',
          gender: 'FEMALE',
          desiredPartnerGenders: null,
          evaluationCount: 0,
        }),
        photos: [
          { id: 'secondary', isPrimary: false },
          { id: 'primary', isPrimary: true },
        ],
      },
    ] as never);

    const result = await service.getMatchesForUser(viewerUserId);

    expect(result.candidates[0]).toEqual(
      expect.objectContaining({
        userProfileId: 'candidate',
        hasEvaluation: false,
        approvedPhotoCount: 2,
        primaryPhotoUrl: '/api/v1/me/matches/candidate/photos/primary/file',
      }),
    );
  });

  it('treats missing desired genders as no filter', async () => {
    profiles.findLegacyProfileMatchesViewer.mockResolvedValue({
      ...viewer,
      desiredPartnerGenders: null,
    } as never);
    profiles.listLegacyAnalyzedCandidatesExcludingUser.mockResolvedValue([
      makeProfileRow({ id: 'female', gender: 'FEMALE' }),
      makeProfileRow({ id: 'male', gender: 'MALE' }),
    ] as never);

    const result = await service.getMatchesForUser(viewerUserId);

    expect(result.viewerAcceptedPartnerGenders).toBeNull();
    expect(result.candidates).toHaveLength(2);
  });
});
