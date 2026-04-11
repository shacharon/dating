import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { RequestHandler } from 'express';
import cookieParserImport from 'cookie-parser';
import { AuthSessionConfigService } from './config/auth-session-config.service';
import { AppModule } from './app.module';
import { SimpleLogger } from './logger/simple-logger.service';

/** `cookie-parser` is CJS; default import typing under `nodenext` can be `error` — pin to Express `RequestHandler`. */
type CookieParserFactory = (secret?: string | string[]) => RequestHandler;

const cookieParser: CookieParserFactory =
  cookieParserImport as CookieParserFactory;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(SimpleLogger);
  app.useLogger(logger);
  // `cookie-parser` types depend on Express v4 merges; middleware is standard RequestHandler.

  app.use(cookieParser());

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
  await app.listen(resolvedPort);

  const url = await app.getUrl();
  logger.log(`Application is running on: ${url}`, 'Bootstrap');
  logger.log('LOG TARGET: console', 'Bootstrap');
}
void bootstrap();
