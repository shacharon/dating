import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProfileGender, UserProfileStatus } from '@prisma/client';
import { MeProfileService } from './me-profile.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('MeProfileService', () => {
  const userId = 'user_svc_1';
  const baseRow = {
    id: 'prof_1',
    userId,
    status: UserProfileStatus.DRAFT,
    onboardingStep: 1,
    aboutMe: 'a' as string | null,
    aboutPartner: null as string | null,
    aboutRelationship: null as string | null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  let prisma: {
    userProfile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: MeProfileService;

  beforeEach(() => {
    prisma = {
      userProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new MeProfileService(prisma as unknown as PrismaService);
  });

  it('getForUser returns null when row missing', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    await expect(service.getForUser(userId)).resolves.toBeNull();
    expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId },
    });
  });

  it('getForUser maps row to response DTO', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(baseRow);
    const r = await service.getForUser(userId);
    expect(r).toMatchObject({
      id: 'prof_1',
      userId,
      status: UserProfileStatus.DRAFT,
      aboutMe: 'a',
      birthDate: null,
      gender: null,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
    });
    expect(r?.createdAt).toEqual(baseRow.createdAt);
  });

  it('createForUser throws ConflictException when profile exists', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(baseRow);
    await expect(service.createForUser(userId, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.userProfile.create).not.toHaveBeenCalled();
  });

  it('createForUser persists DRAFT with picked fields', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    const created = { ...baseRow, aboutMe: 'new' };
    prisma.userProfile.create.mockResolvedValue(created);

    const r = await service.createForUser(userId, {
      aboutMe: 'new',
      onboardingStep: 2,
    });

    expect(r.aboutMe).toBe('new');
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: userId } },
        status: UserProfileStatus.DRAFT,
        aboutMe: 'new',
        onboardingStep: 2,
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
    prisma.userProfile.findUnique.mockResolvedValue(baseRow);
    const r = await service.patchForUser(userId, {});
    expect(r).toMatchObject({ id: 'prof_1', aboutMe: 'a' });
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('patchForUser updates when fields provided', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(baseRow);
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

  it('createForUser maps identity fields to Prisma', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
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
    prisma.userProfile.findUnique.mockResolvedValue({
      ...baseRow,
      birthDate: new Date('1990-05-01T00:00:00.000Z'),
      gender: ProfileGender.MALE,
      desiredPartnerGenders: ['FEMALE', 'OTHER'],
      city: 'Haifa',
      country: 'IL',
      locationLabel: 'Haifa, IL',
    });
    const r = await service.getForUser(userId);
    expect(r?.birthDate).toEqual(new Date('1990-05-01T00:00:00.000Z'));
    expect(r?.gender).toBe(ProfileGender.MALE);
    expect(r?.desiredPartnerGenders).toEqual(['FEMALE', 'OTHER']);
    expect(r?.city).toBe('Haifa');
    expect(r?.country).toBe('IL');
    expect(r?.locationLabel).toBe('Haifa, IL');
  });

  it('patchForUser clears desiredPartnerGenders with null', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(baseRow);
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
