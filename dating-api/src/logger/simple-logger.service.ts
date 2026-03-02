import { Injectable, LoggerService } from '@nestjs/common';
import { appendFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const LOGS_DIR = join(process.cwd(), 'logs');

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
