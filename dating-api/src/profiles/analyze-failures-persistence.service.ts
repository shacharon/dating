import { Injectable } from '@nestjs/common';
import { SimpleLogger } from '../logger/simple-logger.service';

export interface AnalyzeFailureRecord {
  profileId: string;
  error: string;
  time: string;
}

/**
 * In-memory failure sink (console-observable only).
 */
@Injectable()
export class AnalyzeFailuresPersistenceService {
  private readonly failures: AnalyzeFailureRecord[] = [];

  constructor(private readonly logger: SimpleLogger) {}

  /**
   * Append one failure record in memory and log it.
   */
  async append(profileId: string, error: string): Promise<void> {
    const record: AnalyzeFailureRecord = {
      profileId,
      error,
      time: new Date().toISOString(),
    };
    this.failures.push(record);
    this.logger.warn(JSON.stringify({ event: 'analyze_failure', ...record }), 'AnalyzeFailuresPersistence');
  }
}
