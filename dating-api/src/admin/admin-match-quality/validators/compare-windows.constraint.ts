import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import type { MatchQualityCompareQueryDto } from '../dto/match-quality-compare-query.dto';
import { validateCompareQueryMode } from '../match-quality-window';

@ValidatorConstraint({ name: 'compareWindows', async: false })
export class CompareWindowsConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const query = args.object as MatchQualityCompareQueryDto;
    return validateCompareQueryMode(query).ok;
  }

  defaultMessage(): string {
    return 'compare_window_required';
  }
}
