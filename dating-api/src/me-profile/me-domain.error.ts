import { type ErrorCode } from '../logging/error-codes';

/**
 * Shared base for me-* orchestration errors mapped by ObservabilityExceptionFilter.
 */
export abstract class MeDomainError extends Error {
  abstract readonly httpStatus: number;
  /** Body passed to `new HttpException(body, status)` — must match current Nest responses. */
  abstract readonly httpBody: string | Record<string, unknown>;
  /** Stable ErrorCodes.* value for filter logging. */
  abstract readonly errorCode: ErrorCode;

  constructor(message?: string) {
    super(message ?? 'MeDomainError');
    this.name = new.target.name;
  }
}
