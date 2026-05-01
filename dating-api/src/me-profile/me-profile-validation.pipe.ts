import {
  BadRequestException,
  Injectable,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';

function summarizeValidationErrors(errors: ValidationError[]): string {
  const parts: string[] = [];
  for (const e of errors) {
    const path = e.property ? `${e.property}` : '(root)';
    const constraints = e.constraints
      ? Object.values(e.constraints).join(', ')
      : '';
    const child = e.children?.length
      ? ` children=[${summarizeValidationErrors(e.children)}]`
      : '';
    parts.push(
      `${path}${constraints ? `: ${constraints}` : ''}${child}`,
    );
  }
  return parts.join('; ');
}

/**
 * Same rules as the prior inline {@link ValidationPipe} on {@link MeProfileController},
 * plus structured {@link ErrorCodes.ME_PROFILE_VALIDATION_FAILED} logging.
 */
@Injectable()
export class MeProfileValidationPipe extends ValidationPipe {
  constructor(private readonly obs: StructuredObservabilityService) {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        this.obs.error(
          `me profile validation failed: ${summarizeValidationErrors(errors)}`,
          ErrorCodes.ME_PROFILE_VALIDATION_FAILED,
        );
        /** Same flattening as Nest default {@link ValidationPipe} (tests assert on message strings). */
        return new BadRequestException(this.flattenValidationErrors(errors));
      },
    });
  }
}
