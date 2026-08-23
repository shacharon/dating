/**
 * Sub-split from me-profile.service.spec.ts (Sprint 69 Story 03).
 * getForUser / createForUser / patchForUser
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProfileGender, UserProfileOnboardingStep, UserProfileStatus } from '@prisma/client';
import {
  createMeProfileServiceTestContext,
  type MeProfileServiceTestContext,
} from './me-profile.service.spec-support';
import type { MeProfileService } from './me-profile.service';

describe('MeProfileService — crud', () => {
  let service: MeProfileService;
  let prisma: MeProfileServiceTestContext['prisma'];
  let userId: string;
  let baseRow: MeProfileServiceTestContext['baseRow'];
  let profileRow: MeProfileServiceTestContext['profileRow'];

  beforeEach(() => {
    ({ service, prisma, userId, baseRow, profileRow } =
      createMeProfileServiceTestContext());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getForUser returns null when row missing', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    await expect(service.getForUser(userId)).resolves.toBeNull();
    expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId },
      include: { preference: true },
    });
  });

  it('getForUser maps row to response DTO', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(profileRow(baseRow));
    const r = await service.getForUser(userId);
    expect(r).toMatchObject({
      id: 'prof_1',
      userId,
      status: UserProfileStatus.DRAFT,
      aboutMe: 'a',
      birthDate: null,
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
    });
    expect(r?.createdAt).toEqual(baseRow.createdAt);
  });

  it('createForUser creates DRAFT with default gender when body is empty (onboarding step 1)', async () => {
    const created = {
      ...baseRow,
      gender: ProfileGender.PREFER_NOT_TO_SAY,
      aboutMe: null,
    };
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...created,
        desiredPartnerGenders: created.desiredPartnerGenders,
      })
      .mockResolvedValueOnce(profileRow(created));
    prisma.userProfile.create.mockResolvedValue(created);

    await service.createForUser(userId, {});

    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: userId } },
        status: UserProfileStatus.DRAFT,
        gender: ProfileGender.PREFER_NOT_TO_SAY,
      }),
    });
  });

  it('createForUser rejects TEXTS onboarding without desiredPartnerGenders', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    await expect(
      service.createForUser(userId, {
        onboardingStep: UserProfileOnboardingStep.TEXTS,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'onboarding_partner_genders_required',
      }),
    });
    expect(prisma.userProfile.create).not.toHaveBeenCalled();
  });

  it('createForUser throws ConflictException when profile exists', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(baseRow);
    await expect(
      service.createForUser(userId, { gender: ProfileGender.FEMALE }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.userProfile.create).not.toHaveBeenCalled();
  });

  it('createForUser persists DRAFT with picked fields', async () => {
    const created = { ...baseRow, aboutMe: 'new', gender: ProfileGender.FEMALE };
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...created,
        desiredPartnerGenders: created.desiredPartnerGenders,
      })
      .mockResolvedValueOnce(profileRow(created));
    prisma.userProfile.create.mockResolvedValue(created);

    const r = await service.createForUser(userId, {
      gender: ProfileGender.FEMALE,
      aboutMe: 'new',
      desiredPartnerGenders: [ProfileGender.MALE],
      onboardingStep: UserProfileOnboardingStep.TEXTS,
    });

    expect(r.aboutMe).toBe('new');
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: userId } },
        status: UserProfileStatus.DRAFT,
        aboutMe: 'new',
        onboardingStep: UserProfileOnboardingStep.TEXTS,
      }),
    });
  });

  it('patchForUser throws NotFoundException when profile missing', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    await expect(
      service.patchForUser(userId, { aboutMe: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('patchForUser returns existing without update when body is empty', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(profileRow(baseRow));
    const r = await service.patchForUser(userId, {});
    expect(r).toMatchObject({ id: 'prof_1', aboutMe: 'a' });
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('patchForUser updates when fields provided', async () => {
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(profileRow(baseRow))
      .mockResolvedValueOnce({
        ...baseRow,
        desiredPartnerGenders: baseRow.desiredPartnerGenders,
      })
      .mockResolvedValueOnce(
        profileRow({
          ...baseRow,
          aboutMe: 'patched',
          updatedAt: new Date('2026-01-03'),
        }),
      );
    prisma.userProfile.update.mockResolvedValue({
      ...baseRow,
      aboutMe: 'patched',
      updatedAt: new Date('2026-01-03'),
    });

    const r = await service.patchForUser(userId, { aboutMe: 'patched' });

    expect(r.aboutMe).toBe('patched');
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: { aboutMe: 'patched' },
    });
  });

  it('patchForUser omits nickname when unchanged', async () => {
    const row = { ...baseRow, nickname: 'River' };
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(profileRow(row))
      .mockResolvedValueOnce(profileRow(row))
      .mockResolvedValueOnce(profileRow(row));
    prisma.userProfile.update.mockResolvedValue(row);

    await service.patchForUser(userId, {
      nickname: 'River',
      aboutMe: 'patched',
    });

    expect(prisma.userProfile.findFirst).not.toHaveBeenCalled();
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: { aboutMe: 'patched' },
    });
  });

  it('patchForUser rejects nickname already used by another profile', async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce(
      profileRow({ ...baseRow, nickname: 'Mine' }),
    );
    prisma.userProfile.findFirst.mockResolvedValueOnce({ id: 'prof_other' });

    await expect(
      service.patchForUser(userId, { nickname: 'Taken' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'nickname_taken' }),
    });
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('patchForUser rejects COMPLETED onboarding when text fields are incomplete', async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce(profileRow(baseRow));
    await expect(
      service.patchForUser(userId, {
        onboardingStep: UserProfileOnboardingStep.COMPLETED,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'onboarding_texts_incomplete' }),
    });
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('patchForUser persists COMPLETED onboarding with completion timestamp', async () => {
    const rich = {
      ...baseRow,
      aboutMe: 'me',
      aboutPartner: 'them',
      aboutRelationship: 'us',
    };
    const completedAt = new Date('2026-01-10T12:00:00.000Z');
    jest.useFakeTimers({ now: completedAt });
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(profileRow(rich))
      .mockResolvedValueOnce({
        ...rich,
        desiredPartnerGenders: rich.desiredPartnerGenders,
      })
      .mockResolvedValueOnce(
        profileRow({
          ...rich,
          onboardingStep: UserProfileOnboardingStep.COMPLETED,
          onboardingCompletedAt: completedAt,
        }),
      );
    prisma.userProfile.update.mockResolvedValue({
      ...rich,
      onboardingStep: UserProfileOnboardingStep.COMPLETED,
      onboardingCompletedAt: completedAt,
    });

    const r = await service.patchForUser(userId, {
      onboardingStep: UserProfileOnboardingStep.COMPLETED,
    });
    jest.useRealTimers();

    expect(r.onboardingStep).toBe(UserProfileOnboardingStep.COMPLETED);
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: expect.objectContaining({
        onboardingStep: UserProfileOnboardingStep.COMPLETED,
        onboardingCompletedAt: completedAt,
      }),
    });
  });

  it('createForUser maps identity fields to Prisma', async () => {
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        profileRow({
          ...baseRow,
          birthDate: new Date('1991-06-15'),
          gender: ProfileGender.FEMALE,
          desiredPartnerGenders: ['MALE', ProfileGender.NON_BINARY],
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv',
        }),
      );
    const created = {
      ...baseRow,
      birthDate: new Date('1991-06-15'),
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: ['MALE', ProfileGender.NON_BINARY],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv',
    };
    prisma.userProfile.create.mockResolvedValue(created);

    await service.createForUser(userId, {
      birthDate: '1991-06-15',
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: [ProfileGender.MALE, ProfileGender.NON_BINARY],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv',
    });

    expect(prisma.userProfile.findUnique).toHaveBeenLastCalledWith({
      where: { userId },
      include: { preference: true },
    });
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        birthDate: new Date('1991-06-15'),
        gender: ProfileGender.FEMALE,
        desiredPartnerGenders: [ProfileGender.MALE, ProfileGender.NON_BINARY],
        city: 'TLV',
        country: 'IL',
        locationLabel: 'Tel Aviv',
      }),
    });
  });

  it('getForUser maps enriched row and parses desiredPartnerGenders JSON', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      profileRow({
        ...baseRow,
        birthDate: new Date('1990-05-01T00:00:00.000Z'),
        gender: ProfileGender.MALE,
        desiredPartnerGenders: ['FEMALE', 'OTHER'],
        city: 'Haifa',
        country: 'IL',
        locationLabel: 'Haifa, IL',
      }),
    );
    const r = await service.getForUser(userId);
    expect(r?.birthDate).toEqual(new Date('1990-05-01T00:00:00.000Z'));
    expect(r?.gender).toBe(ProfileGender.MALE);
    expect(r?.desiredPartnerGenders).toEqual(['FEMALE', 'OTHER']);
    expect(r?.city).toBe('Haifa');
    expect(r?.country).toBe('IL');
    expect(r?.locationLabel).toBe('Haifa, IL');
  });

  it('patchForUser clears desiredPartnerGenders with null', async () => {
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(profileRow(baseRow))
      .mockResolvedValueOnce(
        profileRow({
          ...baseRow,
          desiredPartnerGenders: null,
        }),
      );
    prisma.userProfile.update.mockResolvedValue({
      ...baseRow,
      desiredPartnerGenders: null,
    });

    await service.patchForUser(userId, { desiredPartnerGenders: null });

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: { desiredPartnerGenders: Prisma.DbNull },
    });
  });
});
