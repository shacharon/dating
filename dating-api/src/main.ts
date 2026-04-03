import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { SimpleLogger } from './logger/simple-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(SimpleLogger);
  app.useLogger(logger);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);
  const corsOrigin = config.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3000,http://127.0.0.1:3000',
  );
  const origins = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  /** Browsers treat localhost vs 127.0.0.1 vs [::1] as different origins; allow any local dev port. */
  const LOCAL_DEV_ORIGIN =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:[1-9]\d{0,4})?$/i;

  const corsCredentials =
    config.get<string>('CORS_CREDENTIALS', 'false').toLowerCase() === 'true';

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
