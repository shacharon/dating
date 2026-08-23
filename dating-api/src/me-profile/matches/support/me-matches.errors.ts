import { ErrorCodes } from '../../../logging/error-codes';
import { MeDomainError } from '../../contracts/me-domain.error';

/** Base for me-matches orchestration errors mapped by ObservabilityExceptionFilter. */
export abstract class MeMatchesDomainError extends MeDomainError {
  constructor(message?: string) {
    super(message ?? 'MeMatchesDomainError');
  }
}

export class MatchListInvalidCursorError extends MeMatchesDomainError {
  readonly httpStatus = 400;
  readonly errorCode = ErrorCodes.ME_MATCHES_INVALID_CURSOR;
  readonly httpBody = {
    error: 'invalid_cursor',
    message: 'Invalid match list cursor.',
  } as const;

  constructor() {
    super('Invalid match list cursor.');
  }
}

const VIEWER_NOT_ANALYZED_MSG =
  'Your profile is not ready for matching. Complete your profile and run analysis first.';
const VIEWER_NO_PHOTO_MSG =
  'Your profile is not ready for matching. Add at least one photo first.';

export class MatchViewerNotReadyError extends MeMatchesDomainError {
  readonly httpStatus = 404;
  readonly errorCode = ErrorCodes.ME_MATCHES_VIEWER_NOT_READY;

  constructor(readonly reason: 'not_analyzed' | 'no_photo') {
    super(
      reason === 'no_photo' ? VIEWER_NO_PHOTO_MSG : VIEWER_NOT_ANALYZED_MSG,
    );
  }

  get httpBody(): string {
    return this.reason === 'no_photo'
      ? VIEWER_NO_PHOTO_MSG
      : VIEWER_NOT_ANALYZED_MSG;
  }
}

export class MatchCandidateNotFoundError extends MeMatchesDomainError {
  readonly httpStatus = 404;
  readonly errorCode = ErrorCodes.ME_MATCHES_CANDIDATE_NOT_FOUND;
  readonly httpBody = 'Match not found.';

  constructor() {
    super('Match not found.');
  }
}

export class MatchDetailEvaluationNotFoundError extends MeMatchesDomainError {
  readonly httpStatus = 404;
  readonly errorCode = ErrorCodes.ME_MATCHES_DETAIL_EVALUATION_NOT_FOUND;
  readonly httpBody = {
    error: 'evaluation_not_found',
    message: 'No analysis result available for this match.',
  } as const;

  constructor() {
    super('No analysis result available for this match.');
  }
}

export class MatchListViewerEvaluationMissingError extends MeMatchesDomainError {
  readonly httpStatus = 500;
  readonly errorCode = ErrorCodes.ME_MATCHES_LIST_VIEWER_EVALUATION_MISSING;
  readonly httpBody = {
    error: 'viewer_evaluation_not_found',
    message:
      'Profile is marked analyzed but no UserProfileEvaluation row exists. Re-run analysis.',
  } as const;

  constructor() {
    super(
      'Profile is marked analyzed but no UserProfileEvaluation row exists. Re-run analysis.',
    );
  }
}

export class MatchListCandidateEvaluationMissingError extends MeMatchesDomainError {
  readonly httpStatus = 500;
  readonly errorCode = ErrorCodes.ME_MATCHES_LIST_CANDIDATE_EVALUATION_MISSING;

  constructor(readonly profileId: string) {
    super(
      `Profile ${profileId} is analyzed but has no UserProfileEvaluation row.`,
    );
  }

  get httpBody(): Record<string, unknown> {
    return {
      error: 'candidate_evaluation_not_found',
      message: `Profile ${this.profileId} is analyzed but has no UserProfileEvaluation row.`,
    };
  }
}

export class MatchPhotoNotFoundError extends MeMatchesDomainError {
  readonly httpStatus = 404;
  readonly errorCode = ErrorCodes.ME_MATCHES_PHOTO_NOT_FOUND;
  readonly httpBody = {
    error: 'photo_not_found',
    message: 'Photo was not found for this match.',
  } as const;

  constructor() {
    super('Photo was not found for this match.');
  }
}

export class MatchPhotoFileNotFoundError extends MeMatchesDomainError {
  readonly httpStatus = 404;
  readonly errorCode = ErrorCodes.ME_MATCHES_PHOTO_FILE_NOT_FOUND;
  readonly httpBody = {
    error: 'photo_file_not_found',
    message: 'Photo file is missing from storage.',
  } as const;

  constructor() {
    super('Photo file is missing from storage.');
  }
}
