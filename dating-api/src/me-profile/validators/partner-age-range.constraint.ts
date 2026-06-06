import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'partnerAgeRange', async: false })
export class PartnerAgeRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as {
      partnerAgeMin?: number | null;
      partnerAgeMax?: number | null;
    };
    const min = obj.partnerAgeMin;
    const max = obj.partnerAgeMax;
    if (min == null || max == null) {
      return true;
    }
    return min <= max;
  }

  defaultMessage(): string {
    return 'partnerAgeMin must be less than or equal to partnerAgeMax';
  }
}
