import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class SimpleLogger implements LoggerService {
  constructor() {
    this.writeLog('=== SERVER STARTED ===');
  }

  private writeLog(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}] ` : '';
    const line = `${timestamp} ${ctx}${message}\n`;
    console.log(line.trim());
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
export const SIMPLE_LOG_FILE = 'console-only';
