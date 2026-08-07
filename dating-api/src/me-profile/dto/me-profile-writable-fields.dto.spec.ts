import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProfileGender, UserProfileOnboardingStep } from '@prisma/client';
import { CreateMeProfileDto } from './me-profile-create.dto';
import { PatchMeProfileDto } from './me-profile-patch.dto';

async function validateCreate(plain: object) {
  const dto = plainToInstance(CreateMeProfileDto, plain);
  return validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('MeProfileWritableFieldsDto / CreateMeProfileDto validation', () => {
  it('accepts valid enriched fields', async () => {
    const errors = await validateCreate({
      birthDate: '1990-06-20',
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: [ProfileGender.MALE, ProfileGender.NON_BINARY],
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Hi',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects future birthDate', async () => {
    const errors = await validateCreate({ birthDate: '2099-12-31' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'birthDate')).toBe(true);
  });

  it('rejects invalid birthDate string', async () => {
    const errors = await validateCreate({ birthDate: 'not-a-date' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid gender enum', async () => {
    const errors = await validateCreate({ gender: 'WIZARD' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects empty desiredPartnerGenders array when provided', async () => {
    const errors = await validateCreate({ desiredPartnerGenders: [] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid entry in desiredPartnerGenders', async () => {
    const errors = await validateCreate({
      desiredPartnerGenders: ['MALE', 'INVALID'],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts null desiredPartnerGenders (clear)', async () => {
    const errors = await validateCreate({ desiredPartnerGenders: null });
    expect(errors).toHaveLength(0);
  });

  it('rejects non-string city', async () => {
    const errors = await validateCreate({ city: 99 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts onboardingStep enum and optional nickname', async () => {
    const errors = await validateCreate({
      gender: ProfileGender.MALE,
      onboardingStep: UserProfileOnboardingStep.BASIC,
      nickname: 'alex_42',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid onboardingStep', async () => {
    const errors = await validateCreate({
      gender: ProfileGender.MALE,
      onboardingStep: 'PHASE_X' as unknown as UserProfileOnboardingStep,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects forbidden userId on create DTO', async () => {
    const dto = plainToInstance(CreateMeProfileDto, {
      aboutMe: 'x',
      userId: 'evil',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts datingChapter enum and null clear', async () => {
    expect(
      await validateCreate({ datingChapter: 'ready_again' }),
    ).toHaveLength(0);
    expect(await validateCreate({ datingChapter: null })).toHaveLength(0);
  });

  it('rejects invalid datingChapter', async () => {
    const errors = await validateCreate({ datingChapter: 'younger' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'datingChapter')).toBe(true);
  });

  it('rejects Sprint-15-removed preference fields on patch (forbidNonWhitelisted)', async () => {
    const removed = [
      'minimumPartnerEducation',
      'acceptedPartnerSmoking',
      'acceptedPartnerAlcohol',
      'acceptedPartnerReligions',
      'partnerWantsChildren',
      'partnerHasChildren',
      'similarityPreference',
    ] as const;
    for (const field of removed) {
      const dto = plainToInstance(PatchMeProfileDto, {
        partnerAgeMin: 25,
        [field]: field === 'acceptedPartnerSmoking' ? ['ANY'] : 'x',
      });
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === field)).toBe(true);
    }
  });

  it('PatchMeProfileDto matches create rules for enriched fields', async () => {
    const dto = plainToInstance(PatchMeProfileDto, {
      gender: ProfileGender.OTHER,
      country: 'US',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });
});
