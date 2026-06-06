import { validate } from 'class-validator';
import { MeProfileWritableFieldsDto } from '../dto/me-profile-writable-fields.dto';

describe('PartnerAgeRangeConstraint', () => {
  it('accepts when min is less than or equal to max', async () => {
    const dto = new MeProfileWritableFieldsDto();
    dto.partnerAgeMin = 25;
    dto.partnerAgeMax = 40;

    const errors = await validate(dto);
    const ageErrors = errors.filter((e) => e.property === 'partnerAgeMax');
    expect(ageErrors).toHaveLength(0);
  });

  it('accepts when only one bound is set', async () => {
    const dto = new MeProfileWritableFieldsDto();
    dto.partnerAgeMin = 25;

    const errors = await validate(dto);
    const ageErrors = errors.filter((e) => e.property === 'partnerAgeMax');
    expect(ageErrors).toHaveLength(0);
  });

  it('rejects when min is greater than max', async () => {
    const dto = new MeProfileWritableFieldsDto();
    dto.partnerAgeMin = 40;
    dto.partnerAgeMax = 30;

    const errors = await validate(dto);
    const ageErrors = errors.filter((e) => e.property === 'partnerAgeMax');
    expect(ageErrors).toHaveLength(1);
    expect(ageErrors[0]?.constraints?.partnerAgeRange).toContain(
      'partnerAgeMin must be less than or equal to partnerAgeMax',
    );
  });
});
