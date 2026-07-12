import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'birthDateNotFuture', async: false })
export class BirthDateNotFutureConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return false;
    }
    return d.getTime() <= Date.now();
  }

  defaultMessage(): string {
    return 'birthDate must not be in the future';
  }
}
