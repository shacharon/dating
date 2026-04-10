import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenderIdentity, ReligionSelf } from '../canonical/matching-canonical.types';
import {
  HolyGrailStructuredWriteError,
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from './holy-grail-structured-write.merge';
import { HolyGrailStructuredWriteService } from './holy-grail-structured-write.service';
import { PrismaService } from '../prisma/prisma.service';

describe('holy-grail structured write merge', () => {
  it('valid sparse write merges onto empty existing', () => {
    const out = mergeHolyGrailStructuredFactsPatch(null, {
      genderIdentity: GenderIdentity.MALE,
      religion: ReligionSelf.JEWISH,
    }) as Record<string, unknown>;
    expect(out.genderIdentity).toBe(GenderIdentity.MALE);
    expect(out.religion).toBe(ReligionSelf.JEWISH);
  });

  it('partial update leaves omitted keys from existing intact', () => {
    const existing = { genderIdentity: GenderIdentity.FEMALE, religion: ReligionSelf.CHRISTIAN };
    const out = mergeHolyGrailStructuredFactsPatch(existing, {
      smoking: 'NEVER',
    }) as Record<string, unknown>;
    expect(out.genderIdentity).toBe(GenderIdentity.FEMALE);
    expect(out.religion).toBe(ReligionSelf.CHRISTIAN);
    expect(out.smoking).toBe('NEVER');
  });

  it('invalid enum is rejected', () => {
    expect(() =>
      mergeHolyGrailStructuredFactsPatch(null, { genderIdentity: 'ALIEN' }),
    ).toThrow(HolyGrailStructuredWriteError);
  });

  it('null patch value removes key; other keys stay absent until set', () => {
    const existing = { genderIdentity: GenderIdentity.MALE, smoking: 'NEVER' };
    const out = mergeHolyGrailStructuredFactsPatch(existing, {
      smoking: null,
    }) as Record<string, unknown>;
    expect(out.genderIdentity).toBe(GenderIdentity.MALE);
    expect(out.smoking).toBeUndefined();
  });

  it('preferences partial merge; empty acceptedPartnerReligions removes key', () => {
    const existing = {
      acceptedPartnerGenders: ['MALE'],
      acceptedPartnerReligions: ['JEWISH'],
    };
    const out = mergeHolyGrailStructuredPreferencesPatch(existing, {
      partnerAgeMin: 25,
      acceptedPartnerReligions: [],
    }) as Record<string, unknown>;
    expect(out.acceptedPartnerGenders).toEqual(['MALE']);
    expect(out.partnerAgeMin).toBe(25);
    expect(out.acceptedPartnerReligions).toBeUndefined();
  });
});

describe('HolyGrailStructuredWriteService', () => {
  const prismaMock = {
    userProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: HolyGrailStructuredWriteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        HolyGrailStructuredWriteService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(HolyGrailStructuredWriteService);
  });

  it('throws NotFound when profile missing', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null);
    await expect(
      service.mergeStructuredLayers('missing', {
        structuredFactsPatch: { genderIdentity: GenderIdentity.MALE },
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('throws BadRequest on invalid enum and does not update', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      holyGrailStructuredFacts: null,
      holyGrailStructuredPreferences: null,
    });
    await expect(
      service.mergeStructuredLayers('p1', {
        structuredFactsPatch: { genderIdentity: 'INVALID' },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('persists merged JSON for partial preferences only', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      holyGrailStructuredFacts: { genderIdentity: GenderIdentity.FEMALE },
      holyGrailStructuredPreferences: { partnerAgeMax: 55 },
    });
    prismaMock.userProfile.update.mockResolvedValue({});

    await service.mergeStructuredLayers('p1', {
      structuredPreferencesPatch: { partnerAgeMin: 30 },
    });

    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {
        holyGrailStructuredPreferences: expect.objectContaining({
          partnerAgeMin: 30,
          partnerAgeMax: 55,
        }),
      },
    });
    expect(prismaMock.userProfile.update.mock.calls[0][0].data.holyGrailStructuredFacts).toBeUndefined();
  });
});
