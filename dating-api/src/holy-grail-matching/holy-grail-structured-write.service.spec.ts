import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenderIdentity, ReligionSelf } from '../canonical/matching-canonical.types';
import {
  HolyGrailStructuredWriteError,
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from './holy-grail-structured-write.merge';
import { HolyGrailStructuredWriteService } from './holy-grail-structured-write.service';

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

  it('similarityPreference null patch stores JSON null (does not delete key)', () => {
    const out = mergeHolyGrailStructuredPreferencesPatch(
      { acceptedPartnerGenders: ['MALE'] },
      { similarityPreference: null },
    ) as Record<string, unknown>;
    expect(out.acceptedPartnerGenders).toEqual(['MALE']);
    expect(out.similarityPreference).toBeNull();
  });
});

describe('HolyGrailStructuredWriteService', () => {
  let service: HolyGrailStructuredWriteService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [HolyGrailStructuredWriteService],
    }).compile();
    service = moduleRef.get(HolyGrailStructuredWriteService);
  });

  it('throws BadRequest when structuredPreferencesPatch is not an object', async () => {
    await expect(
      service.mergeStructuredLayers('p1', {
        structuredPreferencesPatch: [] as unknown,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequest on invalid enum and does not persist', async () => {
    await expect(
      service.mergeStructuredLayers('p1', {
        structuredFactsPatch: { genderIdentity: 'INVALID' },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not persist merged JSON when MatchmakingProfile writes disabled (slice 7); slice 8 null base', async () => {
    await expect(
      service.mergeStructuredLayers('p1', {
        structuredPreferencesPatch: { partnerAgeMin: 30 },
      }),
    ).resolves.toBeUndefined();
  });
});
