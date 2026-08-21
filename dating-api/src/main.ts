import './instrument';
import { initApm } from './observability/apm';
initApm();
import { NestFactory } from '@nestjs/core';
import { RedisIoAdapter } from './messaging-realtime/redis-io.adapter';
import { ConfigService } from '@nestjs/config';
import type { RequestHandler } from 'express';
import cookieParserImport from 'cookie-parser';
import { AuthSessionConfigService } from './config/auth-session-config.service';
import { AppModule } from './app.module';
import { SimpleLogger } from './logger/simple-logger.service';
import { requestCorrelationMiddleware } from './logging/request-correlation.middleware';
import { registerProcessErrorHandlers } from './logging/process-error-handlers';
import { StructuredObservabilityService } from './logging/structured-observability.service';
import { SentryBridgeService } from './observability/sentry-bridge.service';

/** `cookie-parser` is CJS; default import typing under `nodenext` can be `error` — pin to Express `RequestHandler`. */
type CookieParserFactory = (secret?: string | string[]) => RequestHandler;

const cookieParser: CookieParserFactory =
  cookieParserImport as CookieParserFactory;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const wsAdapter = new RedisIoAdapter(app);
  await wsAdapter.connectToRedis();
  app.useWebSocketAdapter(wsAdapter);
  const logger = app.get(SimpleLogger);
  if (!process.env.REDIS_URL?.trim()) {
    logger.warn(
      'REDIS_URL unset — socket.io single-instance mode; multi-instance deploy requires Redis adapter',
      'Bootstrap',
    );
  }
  app.useLogger(logger);
  app.use(requestCorrelationMiddleware);
  // `cookie-parser` types depend on Express v4 merges; middleware is standard RequestHandler.

  app.use(cookieParser());

  const obs = app.get(StructuredObservabilityService);
  const sentry = app.get(SentryBridgeService);
  registerProcessErrorHandlers({ obs, sentry });

  const config = app.get(ConfigService);
  const authSessionConfig = app.get(AuthSessionConfigService);
  const port = config.get<number>('PORT', 3001);
  const corsOrigin = authSessionConfig.corsOrigin;
  const origins = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  /** Browsers treat localhost vs 127.0.0.1 vs [::1] as different origins; allow any local dev port. */
  const LOCAL_DEV_ORIGIN =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:[1-9]\d{0,4})?$/i;

  /** Cookie session uses credentialed browser fetches from the UI origin → allow credentials by default. */
  const corsCredentialsRaw = config.get<string>('CORS_CREDENTIALS');
  const corsCredentials =
    corsCredentialsRaw == null || corsCredentialsRaw.trim() === ''
      ? true
      : ['1', 'true', 'yes', 'on'].includes(
          corsCredentialsRaw.trim().toLowerCase(),
        );

  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (origins.includes(origin)) {
        cb(null, true);
        return;
      }
      if (LOCAL_DEV_ORIGIN.test(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: corsCredentials,
  });

  const resolvedPort = Number(port) || 3001;
  await app.listen(resolvedPort, '0.0.0.0');

  const url = await app.getUrl();
  logger.log(`Application is running on: ${url}`, 'Bootstrap');
  const structuredFile = config.get<string>('STRUCTURED_LOG_FILE')?.trim();
  const structuredDir = config.get<string>('STRUCTURED_LOG_DIR')?.trim();
  const structuredBase = config
    .get<string>('STRUCTURED_LOG_BASE_FILENAME')
    ?.trim();
  const structuredRetention = config
    .get<string>('STRUCTURED_LOG_RETENTION_DAYS')
    ?.trim();
  const nodeEnv = config.get<string>('NODE_ENV')?.trim() ?? '';
  const explicitStructuredConfig = Boolean(structuredDir || structuredBase);
  const retentionHint = structuredRetention
    ? `, retention: ${structuredRetention}d`
    : '';
  const fileHint =
    structuredFile === '0' ||
    structuredFile?.toLowerCase() === 'false' ||
    structuredFile?.toLowerCase() === 'off'
      ? 'structured file sink: disabled'
      : explicitStructuredConfig
        ? `structured file sink: current ${structuredDir ?? 'logs'}/${structuredBase ?? 'logs'}.log, rollover ${structuredBase ?? 'logs'}-YYYY-MM-DD.log${retentionHint}`
        : structuredFile
          ? `structured file sink: current ${structuredFile}, rollover *-YYYY-MM-DD.log${retentionHint}`
          : nodeEnv === 'development'
            ? `structured file sink: current logs/logs.log, rollover logs-YYYY-MM-DD.log${retentionHint} (NODE_ENV=development default)`
            : 'structured file sink: off (stdout only)';
  logger.log(`LOG TARGET: console + structured JSON; ${fileHint}`, 'Bootstrap');
}
void bootstrap();
