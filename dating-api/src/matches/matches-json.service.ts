import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, isAbsolute, normalize } from 'node:path';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { MatchIndexDto, MatchListItemDto, MatchRecordDto } from './match.types';
import { buildShortReason } from './match-short-reason';

/** Sanitize matchId for filename: allow only [a-zA-Z0-9_-] */
function sanitizeMatchId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Resolve data/matches relative to project root. */
function defaultMatchesDir(): string {
  return join(process.cwd(), 'data', 'matches');
}

@Injectable()
export class MatchesJsonService {
  private readonly baseDir: string;

  constructor(
    private readonly logger: SimpleLogger,
    private readonly config: ConfigService,
    @Optional() baseDir?: string,
  ) {
    const envDir = this.config.get<string>('MATCHES_DATA_DIR');
    const trimmed = typeof envDir === 'string' ? envDir.trim() : '';
    if (baseDir != null) {
      this.baseDir = baseDir;
    } else if (trimmed) {
      this.baseDir = isAbsolute(trimmed) ? normalize(trimmed) : join(process.cwd(), normalize(trimmed));
      this.logger.log(
        `MatchesJsonService: using MATCHES_DATA_DIR = ${this.baseDir}`,
        'MatchesJsonService',
      );
    } else {
      this.baseDir = defaultMatchesDir();
      this.logger.log(
        `MatchesJsonService: using default dir = ${this.baseDir}`,
        'MatchesJsonService',
      );
    }
  }

  /**
   * Save or update match. If file exists, preserve createdAt and set updatedAt to now.
   */
  async save(record: MatchRecordDto): Promise<void> {
    const safeId = sanitizeMatchId(record.matchId);
    if (!safeId) throw new Error('matchId sanitized to empty filename');

    await mkdir(this.baseDir, { recursive: true });

    const filePath = join(this.baseDir, `${safeId}.json`);
    let createdAt = record.createdAt;
    const updatedAt = new Date().toISOString();

    try {
      const existing = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(existing) as MatchRecordDto;
      if (parsed?.createdAt) createdAt = parsed.createdAt;
    } catch {
      // file missing or invalid, use record.createdAt
    }

    const toWrite: MatchRecordDto = {
      ...record,
      createdAt,
      updatedAt,
    };

    const tmpPath = join(this.baseDir, `${safeId}.json.tmp`);
    await writeFile(tmpPath, JSON.stringify(toWrite, null, 2), 'utf8');
    await rename(tmpPath, filePath);
  }

  /**
   * List matches from data/matches/*.json, sorted by updatedAt desc.
   */
  async list(): Promise<MatchListItemDto[]> {
    let entries: string[];
    try {
      entries = await readdir(this.baseDir);
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
      if (code === 'ENOENT') return [];
      throw err;
    }

    const items: MatchListItemDto[] = [];
    const jsonFiles = entries.filter(
      (e) => e.endsWith('.json') && !e.endsWith('.json.tmp') && e !== 'index.json',
    );

    for (const file of jsonFiles) {
      const filePath = join(this.baseDir, file);
      try {
        const raw = await readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (
          parsed &&
          typeof parsed === 'object' &&
          'matchId' in parsed &&
          'a' in parsed &&
          'b' in parsed &&
          'overall' in parsed &&
          'updatedAt' in parsed
        ) {
          const r = parsed as MatchRecordDto;
          const finalScore = r.finalScore ?? r.overall;
          const tier = r.balance?.tier ?? r.debug?.tier ?? null;
          const dealbreakersRaw = r.dealbreakers ?? r.debug?.dealbreakers ?? [];
          const dealbreakers = dealbreakersRaw.map((d) => ({
            code: d.code,
            ...(d.severity != null && { severity: d.severity }),
          }));
          const shortReason = buildShortReason({
            finalScore,
            tier: tier ?? 'UNKNOWN',
            dealbreakers,
          });
          const scoreMetadata: MatchListItemDto['scoreMetadata'] = {};
          if (r.coveragePercent != null) scoreMetadata.coveragePercent = r.coveragePercent;
          if (r.coverageFactor != null) scoreMetadata.coverageFactor = r.coverageFactor;
          if (r.friction != null) scoreMetadata.friction = r.friction;
          if (r.rawScore != null) scoreMetadata.rawScore = r.rawScore;

          items.push({
            matchId: r.matchId,
            a: r.a,
            b: r.b,
            overall: r.overall,
            finalScore,
            updatedAt: r.updatedAt,
            tier,
            dealbreakers,
            shortReason,
            ...(r.explainability != null && { explainability: r.explainability }),
            ...(r.recommendation != null && { recommendation: r.recommendation }),
            ...(Object.keys(scoreMetadata).length > 0 && { scoreMetadata }),
          });
        }
      } catch (err) {
        this.logger.warn(
          `MatchesJsonService: invalid or unreadable JSON, skipping: ${file}`,
          'MatchesJsonService',
        );
      }
    }

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return items;
  }

  /**
   * Load all match records from disk (no policyVersion filter). For analytics.
   */
  async getAllRecords(): Promise<MatchRecordDto[]> {
    let entries: string[];
    try {
      entries = await readdir(this.baseDir);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as NodeJS.ErrnoException).code
          : '';
      if (code === 'ENOENT') return [];
      throw err;
    }

    const jsonFiles = entries.filter(
      (e) => e.endsWith('.json') && !e.endsWith('.json.tmp') && e !== 'index.json',
    );

    const results: MatchRecordDto[] = [];

    for (const file of jsonFiles) {
      try {
        const raw = await readFile(join(this.baseDir, file), 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (
          parsed &&
          typeof parsed === 'object' &&
          'matchId' in parsed &&
          'a' in parsed &&
          'b' in parsed &&
          'overall' in parsed
        ) {
          results.push(parsed as MatchRecordDto);
        }
      } catch {
        this.logger.warn(
          `MatchesJsonService.getAllRecords: skipping unreadable file: ${file}`,
          'MatchesJsonService',
        );
      }
    }

    return results;
  }

  /**
   * List full match records filtered by policyVersion and optional minCoveragePercent.
   */
  async listFull(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<MatchRecordDto[]> {
    let entries: string[];
    try {
      entries = await readdir(this.baseDir);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as NodeJS.ErrnoException).code
          : '';
      if (code === 'ENOENT') return [];
      throw err;
    }

    const jsonFiles = entries.filter(
      (e) => e.endsWith('.json') && !e.endsWith('.json.tmp') && e !== 'index.json',
    );

    const results: MatchRecordDto[] = [];

    for (const file of jsonFiles) {
      try {
        const raw = await readFile(join(this.baseDir, file), 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (
          parsed &&
          typeof parsed === 'object' &&
          'matchId' in parsed &&
          'a' in parsed &&
          'b' in parsed &&
          'overall' in parsed
        ) {
          const r = parsed as MatchRecordDto;
          if ((r.policyVersion ?? '') !== opts.policyVersion) continue;
          if (
            opts.minCoveragePercent != null &&
            (r.coveragePercent ?? 0) < opts.minCoveragePercent
          )
            continue;
          results.push(r);
        }
      } catch {
        this.logger.warn(
          `MatchesJsonService.listFull: skipping unreadable file: ${file}`,
          'MatchesJsonService',
        );
      }
    }

    results.sort(
      (a, b) => (b.finalScore ?? b.overall) - (a.finalScore ?? a.overall),
    );
    return results;
  }

  /**
   * Get one match by matchId. Returns null if file missing or invalid.
   */
  async getById(matchId: string): Promise<MatchRecordDto | null> {
    const safeId = sanitizeMatchId(matchId);
    if (!safeId) return null;

    const filePath = join(this.baseDir, `${safeId}.json`);
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        'matchId' in parsed &&
        'a' in parsed &&
        'b' in parsed &&
        'overall' in parsed &&
        'createdAt' in parsed &&
        'updatedAt' in parsed
      ) {
        return parsed as MatchRecordDto;
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
      if (code === 'ENOENT') return null;
      this.logger.warn(
        `MatchesJsonService: invalid or unreadable JSON for matchId ${matchId}`,
        'MatchesJsonService',
      );
      return null;
    }
    return null;
  }

  /**
   * Write index.json (overwrites). Caller must pass sorted items (e.g. by overall desc).
   */
  async saveIndex(index: MatchIndexDto): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    const filePath = join(this.baseDir, 'index.json');
    const tmpPath = join(this.baseDir, 'index.json.tmp');
    await writeFile(tmpPath, JSON.stringify(index, null, 2), 'utf8');
    await rename(tmpPath, filePath);
  }

  /**
   * Read index.json. Returns null if missing or invalid.
   */
  async getIndex(): Promise<MatchIndexDto | null> {
    const filePath = join(this.baseDir, 'index.json');
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        'generatedAt' in parsed &&
        'profileCount' in parsed &&
        'matchCount' in parsed &&
        'items' in parsed &&
        Array.isArray((parsed as MatchIndexDto).items)
      ) {
        return parsed as MatchIndexDto;
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
      if (code === 'ENOENT') return null;
      this.logger.warn(
        `MatchesJsonService: invalid or unreadable index.json`,
        'MatchesJsonService',
      );
      return null;
    }
    return null;
  }
}
