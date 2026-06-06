import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { SentryBridgeService } from '../observability/sentry-bridge.service';
import { ErrorCodes } from './error-codes';
import { isHttpExceptionObservabilityLogged } from './observability-http.exception';
import { StructuredObservabilityService } from './structured-observability.service';

@Catch()
export class ObservabilityExceptionFilter extends BaseExceptionFilter {
  constructor(
    private readonly obs: StructuredObservabilityService,
    private readonly sentry: SentryBridgeService,
    httpAdapterHost: HttpAdapterHost,
  ) {
    super(httpAdapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (
        status >= HttpStatus.INTERNAL_SERVER_ERROR &&
        !isHttpExceptionObservabilityLogged(exception)
      ) {
        this.obs.httpServerError(
          `HttpException status=${status}`,
          exception,
        );
        this.sentry.captureException(exception, {
          errorCode: ErrorCodes.HTTP_EXCEPTION,
          tags: { subsystem: 'http', httpStatus: String(status) },
        });
      }
    } else {
      this.obs.fatal(
        exception instanceof Error
          ? exception.message
          : 'Unhandled non-HTTP exception',
        ErrorCodes.HTTP_UNHANDLED,
        exception,
      );
      this.sentry.captureException(exception, {
        errorCode: ErrorCodes.HTTP_UNHANDLED,
        tags: { subsystem: 'http' },
      });
    }
    super.catch(exception, host);
  }
}
