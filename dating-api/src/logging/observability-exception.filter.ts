import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { ErrorCodes } from './error-codes';
import { isHttpExceptionObservabilityLogged } from './observability-http.exception';
import { StructuredObservabilityService } from './structured-observability.service';

@Catch()
export class ObservabilityExceptionFilter extends BaseExceptionFilter {
  constructor(
    private readonly obs: StructuredObservabilityService,
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
      }
    } else {
      this.obs.fatal(
        exception instanceof Error
          ? exception.message
          : 'Unhandled non-HTTP exception',
        ErrorCodes.HTTP_UNHANDLED,
        exception,
      );
    }
    super.catch(exception, host);
  }
}
