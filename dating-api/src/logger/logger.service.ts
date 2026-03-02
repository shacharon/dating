import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/** Logs directory: process.cwd()/logs. Absolute path so you can copy-paste into Explorer. */
export const LOGS_DIR = resolve(process.cwd(), 'logs');

/** What Nest logger methods write to the file: log→info, error→error, warn→warn, debug→debug, verbose→verbose */
const LOG_LEVELS_README = `Log file location: ${LOGS_DIR}
Today's file: server-YYYY-MM-DD.log (UTC date)

What gets written:
  logger.log()   -> level "info"
  logger.error() -> level "error"
  logger.warn()  -> level "warn"
  logger.debug() -> level "debug"
  logger.verbose()-> level "verbose"

Default LOG_LEVEL=info → file has: info, warn, error.
Set LOG_LEVEL=debug (env) to also see debug in the file.
`;

const REDACT_KEYS = [
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'token',
  'jwt',
  'apikey',
];

function safeJsonFormat(): winston.Logform.Format {
  return winston.format((info) => {
    const redactKeys = new Set(REDACT_KEYS.map((k) => k.toLowerCase()));
    const visit = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== 'object') return obj;
      const out: Record<string, unknown> = (
        Array.isArray(obj) ? [] : {}
      ) as Record<string, unknown>;
      for (const k of Object.keys(obj as Record<string, unknown>)) {
        const lk = k.toLowerCase();
        out[k] = redactKeys.has(lk)
          ? '[REDACTED]'
          : visit((obj as Record<string, unknown>)[k]);
      }
      return out;
    };
    return visit(info) as winston.Logform.TransformableInfo;
  })();
}

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    mkdirSync(LOGS_DIR, { recursive: true });
    try {
      writeFileSync(join(LOGS_DIR, 'README.txt'), LOG_LEVELS_README, 'utf8');
      const cwd = process.cwd();
      writeFileSync(
        resolve(cwd, 'LOGS_ARE_HERE.txt'),
        `LOG FILES ARE IN THIS FOLDER:\n${LOGS_DIR}\n\nToday's file: server.log (after a day it rotates to server-YYYY-MM-DD.log).\n`,
        'utf8',
      );
    } catch {
      // ignore if read-only
    }
    const level = process.env.LOG_LEVEL ?? 'info';

    const fileTransport = new DailyRotateFile({
      dirname: LOGS_DIR,
      filename: 'server-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level,
      utc: true,
      createSymlink: true,
      symlinkName: 'server.log',
    });

    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        safeJsonFormat(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        fileTransport,
        new winston.transports.File({
          filename: join(LOGS_DIR, 'app.log'),
          level,
        }),
        new winston.transports.Console({
          level,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context, ...meta }) => {
                const ctxStr =
                  context == null
                    ? ''
                    : typeof context === 'object'
                      ? JSON.stringify(context)
                      : // eslint-disable-next-line @typescript-eslint/no-base-to-string -- primitive context
                      String(context);
                const ctx = ctxStr ? ` [${ctxStr}]` : '';
                const msgStr =
                  typeof message === 'string'
                    ? message
                    : JSON.stringify(message);
                const rest = Object.keys(meta).length
                  ? ` ${JSON.stringify(meta)}`
                  : '';
                return `${String(timestamp)} ${String(level)}${ctx} ${msgStr}${rest}`;
              },
            ),
          ),
        }),
      ],
    });
  }

  private toMessage(message: unknown): string {
    return typeof message === 'string' ? message : JSON.stringify(message);
  }

  log(message: unknown, context?: string): void {
    this.logger.info(this.toMessage(message), { context });
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error(this.toMessage(message), { context, trace });
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn(this.toMessage(message), { context });
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug(this.toMessage(message), { context });
  }

  verbose(message: unknown, context?: string): void {
    this.logger.verbose(this.toMessage(message), { context });
  }
}
