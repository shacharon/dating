import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { SimpleLogger, SIMPLE_LOG_FILE } from './logger/simple-logger.service';

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

  app.enableCors({
    origin:
      origins.length > 0
        ? origins
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true,
  });

  const resolvedPort = Number(port) || 3001;
  await app.listen(resolvedPort);

  const url = await app.getUrl();
  logger.log(`Application is running on: ${url}`, 'Bootstrap');
  logger.log(`LOG FILE: ${SIMPLE_LOG_FILE}`, 'Bootstrap');
}
void bootstrap();
