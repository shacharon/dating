import { Injectable, LoggerService } from '@nestjs/common';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

function resolveLogsDir(): string {
  const cwd = process.cwd();
  const cwdLooksLikeApi = existsSync(join(cwd, 'package.json')) && cwd.endsWith('dating-api');
  if (cwdLooksLikeApi) {
    return join(cwd, 'logs');
  }

  const nestedApiDir = join(cwd, 'dating-api');
  if (existsSync(join(nestedApiDir, 'package.json'))) {
    return join(nestedApiDir, 'logs');
  }

  return join(cwd, 'logs');
}

const LOGS_DIR = resolveLogsDir();
const LOG_POINTER_FILE = resolve(process.cwd(), 'LOGS_ARE_HERE.txt');

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class SimpleLogger implements LoggerService {
  private currentDate: string;
  private currentLogFile: string;

  constructor() {
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }
    this.currentDate = getTodayDateString();
    this.currentLogFile = join(LOGS_DIR, 'dating.log');
    try {
      // Ensure file exists even before first real log line.
      appendFileSync(this.currentLogFile, '', 'utf8');
      writeFileSync(
        LOG_POINTER_FILE,
        `BACKEND LOG FILE:\n${this.currentLogFile}\n`,
        'utf8',
      );
    } catch {
      // Best-effort only; logging continues even if pointer write fails.
    }
    this.writeLog('=== SERVER STARTED ===');
  }

  private checkRotation(): void {
    const today = getTodayDateString();
    if (today !== this.currentDate) {
      // New day - rotate the log
      try {
        const oldLogFile = join(LOGS_DIR, `dating-${this.currentDate}.log`);
        if (existsSync(this.currentLogFile)) {
          renameSync(this.currentLogFile, oldLogFile);
        }
        this.currentDate = today;
      } catch (err) {
        console.error('Failed to rotate log:', err);
      }
    }
  }

  private writeLog(message: string, context?: string): void {
    this.checkRotation();

    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}] ` : '';
    const line = `${timestamp} ${ctx}${message}\n`;

    // Write to console
    console.log(line.trim());

    // Write to file
    try {
      appendFileSync(this.currentLogFile, line, 'utf8');
    } catch (err) {
      console.error('Failed to write log:', err);
    }
  }

  log(message: any, context?: string): void {
    this.writeLog(`INFO: ${message}`, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.writeLog(`ERROR: ${message}`, context);
    if (trace) {
      this.writeLog(`TRACE: ${trace}`, context);
    }
  }

  warn(message: any, context?: string): void {
    this.writeLog(`WARN: ${message}`, context);
  }

  debug(message: any, context?: string): void {
    this.writeLog(`DEBUG: ${message}`, context);
  }

  verbose(message: any, context?: string): void {
    this.writeLog(`VERBOSE: ${message}`, context);
  }
}

export const SIMPLE_LOGS_DIR = LOGS_DIR;
export const SIMPLE_LOG_FILE = join(LOGS_DIR, 'dating.log');
