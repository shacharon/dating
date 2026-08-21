import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, isAbsolute, normalize } from 'node:path';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate-public-api';
import type { RawInterests } from '../extraction/extracted-interests.interface';

/** Resolve data/profiles relative to project root (works when run from dist/profiles). */
function defaultProfilesDir(): string {
  if (typeof __dirname !== 'undefined') {
    return join(__dirname, '..', '..', 'data', 'profiles');
  }
  return join(process.cwd(), 'data', 'profiles');
}

/** Sanitize id for filename: allow only [a-zA-Z0-9_-], replace other chars with _. */
export function sanitizeIdForFilename(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export interface ProfileJsonPayload {
  id: string;
  name: string;
  texts: {
    aboutMe: string;
    aboutPartner: string;
    aboutRelationship: string;
  };
  /** Full evaluation result including optional extendedSignals (v1: motivation + attraction traits). */
  evaluation: EvaluateBatchResult;
  savedAt: string;
  /** Set after successful analyze-all; enables resume. */
  evaluationStatus?: 'DONE' | 'FAILED';
  /** Set when evaluationStatus is FAILED (e.g. last run error). */
  lastError?: string;
  /** Analysis cache metadata (set after successful analysis). */
  evaluatedAt?: string;
  promptVersion?: string;
  policyVersion?: string;
  textHash?: string;
  /** Flattened signals for cache hit detection (evaluation.self.signals). */
  signals?: Record<string, number | null>;
  /** Phase 1: Raw interests extraction (optional, additive, not used in scoring). */
  rawInterests?: RawInterests;
}

export interface ProfileListItem {
  id: string;
  name: string;
  savedAt: string;
}

@Injectable()
export class ProfilesJsonService {
  private readonly baseDir: string;

  constructor(
    private readonly logger: SimpleLogger,
    private readonly config: ConfigService,
    @Optional() baseDir?: string,
  ) {
    const envDir = this.config.get<string>('PROFILES_DATA_DIR');
    const trimmed = typeof envDir === 'string' ? envDir.trim() : '';
    if (baseDir != null) {
      this.baseDir = baseDir;
    } else if (trimmed) {
      this.baseDir = isAbsolute(trimmed) ? normalize(trimmed) : join(process.cwd(), normalize(trimmed));
      this.logger.log(
        `ProfilesJsonService: using PROFILES_DATA_DIR = ${this.baseDir}`,
        'ProfilesJsonService',
      );
    } else {
      this.baseDir = defaultProfilesDir();
      this.logger.log(
        `ProfilesJsonService: using default dir = ${this.baseDir}`,
        'ProfilesJsonService',
      );
    }
  }

  /**
   * Ensure data/profiles exists, then write payload to data/profiles/<safeId>.json atomically.
   */
  async save(id: string, payload: Omit<ProfileJsonPayload, 'savedAt'>): Promise<void> {
    const safeId = sanitizeIdForFilename(id);
    if (!safeId) {
      throw new Error('Id sanitized to empty filename');
    }

    await mkdir(this.baseDir, { recursive: true });

    const full: ProfileJsonPayload = {
      ...payload,
      savedAt: new Date().toISOString(),
    };

    const filePath = join(this.baseDir, `${safeId}.json`);
    const tmpPath = join(this.baseDir, `${safeId}.json.tmp`);

    await writeFile(tmpPath, JSON.stringify(full, null, 2), 'utf8');
    await rename(tmpPath, filePath);
  }

  /**
   * List all profiles: read data/profiles/*.json, parse each; skip invalid JSON with a log.
   * Returns { id, name, savedAt } sorted by savedAt desc.
   */
  async list(): Promise<ProfileListItem[]> {
    let entries: string[];
    try {
      entries = await readdir(this.baseDir);
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
      if (code === 'ENOENT') return [];
      throw err;
    }

    const items: ProfileListItem[] = [];
    const jsonFiles = entries.filter((e) => e.endsWith('.json') && !e.endsWith('.json.tmp'));

    for (const file of jsonFiles) {
      const filePath = join(this.baseDir, file);
      try {
        const raw = await readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (
          parsed &&
          typeof parsed === 'object' &&
          'id' in parsed &&
          'name' in parsed &&
          'savedAt' in parsed &&
          typeof (parsed as ProfileJsonPayload).id === 'string' &&
          typeof (parsed as ProfileJsonPayload).name === 'string' &&
          typeof (parsed as ProfileJsonPayload).savedAt === 'string'
        ) {
          items.push({
            id: (parsed as ProfileJsonPayload).id,
            name: (parsed as ProfileJsonPayload).name,
            savedAt: (parsed as ProfileJsonPayload).savedAt,
          });
        }
      } catch (err) {
        this.logger.warn(
          `ProfilesJsonService: invalid or unreadable JSON, skipping: ${file}`,
          'ProfilesJsonService',
        );
      }
    }

    items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    return items;
  }

  /**
   * Get full profile by id. Resolves :id to filename using sanitized id (no path traversal).
   * Returns null if file missing or invalid JSON.
   */
  async getById(id: string): Promise<ProfileJsonPayload | null> {
    const safeId = sanitizeIdForFilename(id);
    if (!safeId) return null;

    const filePath = join(this.baseDir, `${safeId}.json`);
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && 'id' in parsed && 'name' in parsed && 'texts' in parsed && 'evaluation' in parsed && 'savedAt' in parsed) {
        return parsed as ProfileJsonPayload;
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
      if (code === 'ENOENT') return null;
      this.logger.warn(
        `ProfilesJsonService: invalid or unreadable JSON for id ${id}`,
        'ProfilesJsonService',
      );
      return null;
    }
    return null;
  }
}
