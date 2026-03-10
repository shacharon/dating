import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFile, mkdir } from 'node:fs/promises';
import { join, isAbsolute, normalize } from 'node:path';
import { SimpleLogger } from '../logger/simple-logger.service';

const DEFAULT_FAILURES_FILENAME = 'analyze_failures.json';

/** Resolve data dir: same convention as profiles (data/ at project root). */
function defaultDataDir(): string {
  if (typeof __dirname !== 'undefined') {
    return join(__dirname, '..', '..', 'data');
  }
  return join(process.cwd(), 'data');
}

export interface AnalyzeFailureRecord {
  profileId: string;
  error: string;
  time: string;
}

/**
 * Appends analyze-all failures to data/analyze_failures.json (one JSON object per line, NDJSON).
 * Enables retry by reading profileIds from the file.
 */
@Injectable()
export class AnalyzeFailuresPersistenceService {
  private readonly filePath: string;

  constructor(
    private readonly logger: SimpleLogger,
    private readonly config: ConfigService,
  ) {
    const envDir = this.config.get<string>('PROFILES_DATA_DIR');
    const trimmed = typeof envDir === 'string' ? envDir.trim() : '';
    const dataDir = trimmed
      ? (isAbsolute(trimmed) ? join(trimmed, '..') : join(process.cwd(), normalize(trimmed), '..'))
      : defaultDataDir();
    this.filePath = join(dataDir, DEFAULT_FAILURES_FILENAME);
  }

  /**
   * Append one failure record. Creates data dir and file if needed.
   */
  async append(profileId: string, error: string): Promise<void> {
    const record: AnalyzeFailureRecord = {
      profileId,
      error,
      time: new Date().toISOString(),
    };
    const line = JSON.stringify(record) + '\n';
    try {
      await mkdir(join(this.filePath, '..'), { recursive: true });
      await appendFile(this.filePath, line, 'utf8');
    } catch (err) {
      this.logger.warn(
        `AnalyzeFailuresPersistence: failed to append failure for ${profileId}: ${err}`,
        'AnalyzeFailuresPersistence',
      );
    }
  }
}
