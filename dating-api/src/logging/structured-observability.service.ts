import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { ErrorCode } from './error-codes';
import { ErrorCodes } from './error-codes';
import { getRequestLogFields } from './request-log-context';
import type { StructuredLogLevel, StructuredLogLine } from './structured-log.types';

function pickStack(err: unknown): string | undefined {
  if (err instanceof Error && err.stack) {
    return err.stack;
  }
  return undefined;
}

@Injectable()
export class StructuredObservabilityService {
  private readonly serviceName: string;
  private readonly envName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: SimpleLogger,
  ) {
    this.serviceName =
      this.config.get<string>('SERVICE_NAME')?.trim() || 'dating-api';
    this.envName =
      this.config.get<string>('NODE_ENV')?.trim() || 'development';
  }

  private base(): Omit<
    StructuredLogLine,
    'level' | 'message' | 'errorCode' | 'stack'
  > {
    const ctx = getRequestLogFields();
    return {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      env: this.envName,
      requestId: ctx?.requestId ?? null,
      route: ctx?.route ?? null,
      method: ctx?.method ?? null,
      userId: ctx?.userId ?? null,
      sessionId: ctx?.sessionId ?? null,
    };
  }

  private emit(line: StructuredLogLine): void {
    this.logger.emitStructured(line);
  }

  trace(message: string, errorCode?: ErrorCode): void {
    const line: StructuredLogLine = {
      ...this.base(),
      level: 'trace',
      message,
      ...(errorCode ? { errorCode } : {}),
    };
    this.emit(line);
  }

  error(
    message: string,
    errorCode: ErrorCode,
    cause?: unknown,
    opts?: { includeStack?: boolean },
  ): void {
    const includeStack = opts?.includeStack !== false;
    const line: StructuredLogLine = {
      ...this.base(),
      level: 'error',
      message,
      errorCode,
      ...(includeStack && cause ? { stack: pickStack(cause) } : {}),
    };
    this.emit(line);
  }

  fatal(message: string, errorCode: ErrorCode, cause: unknown): void {
    const line: StructuredLogLine = {
      ...this.base(),
      level: 'fatal',
      message,
      errorCode,
      stack: pickStack(cause),
    };
    this.emit(line);
  }

  /** HttpException status >= 500 (when not already logged by a feature path). */
  httpServerError(message: string, cause: unknown): void {
    const line: StructuredLogLine = {
      ...this.base(),
      level: 'error',
      message,
      errorCode: ErrorCodes.HTTP_EXCEPTION,
      stack: pickStack(cause),
    };
    this.emit(line);
  }
}
