import { ErrorCodes } from '../logging/error-codes';
import { MeDomainError } from './contracts/me-domain.error';

/** Base for me-profile orchestration errors (submit path). */
export abstract class MeProfileDomainError extends MeDomainError {
  constructor(message?: string) {
    super(message ?? 'MeProfileDomainError');
  }
}

const PROFILE_NOT_FOUND_FOR_SUBMIT_MSG =
  'No profile exists for this account. Use POST /api/v1/me/profile to create one.';

export class ProfileNotFoundForSubmitError extends MeProfileDomainError {
  readonly httpStatus = 404;
  readonly errorCode = ErrorCodes.ME_PROFILE_GET_NOT_FOUND;
  readonly httpBody = {
    error: 'profile_not_found',
    message: PROFILE_NOT_FOUND_FOR_SUBMIT_MSG,
  } as const;

  constructor() {
    super(PROFILE_NOT_FOUND_FOR_SUBMIT_MSG);
  }
}

export class ProfileSubmitInvalidStateError extends MeProfileDomainError {
  readonly httpStatus = 422;
  readonly errorCode = ErrorCodes.ME_PROFILE_SUBMIT_INVALID_STATE;

  constructor(
    readonly currentStatus: string,
    readonly allowedStatuses: string[],
  ) {
    super(
      `Profile cannot be submitted from status "${currentStatus}". Allowed: ${allowedStatuses.join(', ')}.`,
    );
  }

  get httpBody(): Record<string, unknown> {
    return {
      error: 'invalid_submit_state',
      currentStatus: this.currentStatus,
      allowedStatuses: this.allowedStatuses,
      message: this.message,
    };
  }
}

const GENDER_REQUIRED_MSG =
  'Choose a gender (other than prefer-not-to-say) before submitting the profile for analysis.';

export class ProfileSubmitGenderRequiredError extends MeProfileDomainError {
  readonly httpStatus = 422;
  readonly errorCode = ErrorCodes.ME_PROFILE_SUBMIT_INVALID_STATE;
  readonly httpBody = {
    error: 'gender_required',
    message: GENDER_REQUIRED_MSG,
  } as const;

  constructor() {
    super(GENDER_REQUIRED_MSG);
  }
}

const PHOTO_REQUIRED_MSG =
  'Upload at least one approved photo before submitting for analysis.';

export class ProfileSubmitPhotoRequiredError extends MeProfileDomainError {
  readonly httpStatus = 422;
  readonly errorCode = ErrorCodes.ME_PROFILE_PHOTO_REQUIRED;
  readonly httpBody = {
    error: 'photo_required',
    message: PHOTO_REQUIRED_MSG,
  } as const;

  constructor() {
    super(PHOTO_REQUIRED_MSG);
  }
}

export class ProfileSubmitReloadFailedError extends MeProfileDomainError {
  readonly httpStatus = 500;
  readonly errorCode = ErrorCodes.ME_PROFILE_SUBMIT_FAILED;
  readonly httpBody = {
    message: 'Profile could not be loaded after submit',
  } as const;

  constructor() {
    super('Profile could not be loaded after submit');
  }
}

export class ProfileSubmitPersistenceFailedError extends MeProfileDomainError {
  readonly httpStatus = 500;
  readonly errorCode = ErrorCodes.ME_PROFILE_SUBMIT_FAILED;
  readonly httpBody = {
    message: 'Profile could not be submitted',
  } as const;

  constructor() {
    super('Profile could not be submitted');
  }
}
