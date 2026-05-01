import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StructuredLogLine } from '../logging/structured-log.types';

const DAY_MS = 24 * 60 * 60 * 1000;
const DISABLED_VALUES = new Set(['0', 'false', 'off']);

interface StructuredFileSinkConfig {
  directory: string;
  baseName: string;
  extension: string;
  retentionDays: number;
  maxBytes: number | null;
}

@Injectable()
export class SimpleLogger implements LoggerService {
  /** After a failed write, skip further attempts (read-only FS, missing volume, etc.). */
  private structuredFileSinkDisabled = false;
  private lastRetentionSweepDate: string | null = null;

  constructor(private readonly config: ConfigService) {
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

  private normalizedConfigValue(key: string): string {
    return (this.config.get<string>(key) ?? '').trim();
  }

  private isDisabledValue(value: string): boolean {
    return DISABLED_VALUES.has(value.toLowerCase());
  }

  private parsePositiveInteger(value: string): number | null {
    if (!value) return null;
    if (!/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  private sinkConfigFromLegacyPath(pathValue: string): StructuredFileSinkConfig {
    const directory = dirname(pathValue);
    const fileName = basename(pathValue);
    const extension = extname(fileName) || '.log';
    const fileBaseName = basename(fileName, extension) || 'dating-api';
    return {
      directory,
      baseName: fileBaseName,
      extension,
      retentionDays: 14,
      maxBytes: null,
    };
  }

  /**
   * Structured file sink supports:
   * - `STRUCTURED_LOG_FILE` (legacy compatibility): full path used as base for rotated files.
   * - `STRUCTURED_LOG_DIR`, `STRUCTURED_LOG_BASE_FILENAME`, `STRUCTURED_LOG_RETENTION_DAYS`.
   * - optional `STRUCTURED_LOG_MAX_SIZE_MB` for same-day chunking.
   *
   * Daily files are named `<base>-YYYY-MM-DD[.-part].log` in UTC day boundaries.
   * Values `0` / `false` / `off` on `STRUCTURED_LOG_FILE` disable the sink.
   */
  private structuredFileSinkConfig(): StructuredFileSinkConfig | null {
    const legacyFile = this.normalizedConfigValue('STRUCTURED_LOG_FILE');
    if (this.isDisabledValue(legacyFile)) {
      return null;
    }

    const configuredDir = this.normalizedConfigValue('STRUCTURED_LOG_DIR');
    const configuredBase = this.normalizedConfigValue(
      'STRUCTURED_LOG_BASE_FILENAME',
    );
    const configuredRetention = this.normalizedConfigValue(
      'STRUCTURED_LOG_RETENTION_DAYS',
    );
    const configuredMaxSizeMb = this.normalizedConfigValue(
      'STRUCTURED_LOG_MAX_SIZE_MB',
    );

    const fromLegacy = legacyFile
      ? this.sinkConfigFromLegacyPath(legacyFile)
      : null;
    const nodeEnv = this.normalizedConfigValue('NODE_ENV');
    const useDevelopmentDefault =
      !legacyFile && !configuredDir && !configuredBase && nodeEnv === 'development';

    if (!fromLegacy && !configuredDir && !configuredBase && !useDevelopmentDefault) {
      return null;
    }

    const directory =
      configuredDir || fromLegacy?.directory || 'logs';
    const baseName =
      configuredBase || fromLegacy?.baseName || 'logs';
    const extension = fromLegacy?.extension || '.log';
    const retentionDays =
      this.parsePositiveInteger(configuredRetention) ??
      fromLegacy?.retentionDays ??
      14;
    const maxSizeMb = this.parsePositiveInteger(configuredMaxSizeMb);
    const maxBytes = maxSizeMb == null ? null : maxSizeMb * 1024 * 1024;

    return { directory, baseName, extension, retentionDays, maxBytes };
  }

  private utcDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private rotatedFilePath(
    cfg: StructuredFileSinkConfig,
    dateStamp: string,
    partIndex: number,
  ): string {
    const partSuffix = partIndex > 0 ? `.${partIndex}` : '';
    return join(cfg.directory, `${cfg.baseName}-${dateStamp}${partSuffix}${cfg.extension}`);
  }

  private currentFilePath(cfg: StructuredFileSinkConfig): string {
    return join(cfg.directory, `${cfg.baseName}${cfg.extension}`);
  }

  private firstAvailableRotatedFilePath(
    cfg: StructuredFileSinkConfig,
    dateStamp: string,
  ): string {
    let partIndex = 0;
    while (true) {
      const candidate = this.rotatedFilePath(cfg, dateStamp, partIndex);
      if (!existsSync(candidate)) {
        return candidate;
      }
      partIndex += 1;
    }
  }

  private rotateIfDayChanged(
    cfg: StructuredFileSinkConfig,
    currentPath: string,
    now: Date,
  ): void {
    if (!existsSync(currentPath)) return;
    const stats = statSync(currentPath);
    const currentDayStamp = this.utcDateStamp(stats.mtime);
    const todayStamp = this.utcDateStamp(now);
    if (currentDayStamp === todayStamp) return;
    const rotatedPath = this.firstAvailableRotatedFilePath(cfg, currentDayStamp);
    renameSync(currentPath, rotatedPath);
  }

  private rotateIfSizeExceeded(
    cfg: StructuredFileSinkConfig,
    currentPath: string,
    now: Date,
  ): void {
    if (cfg.maxBytes == null || !existsSync(currentPath)) return;
    const stats = statSync(currentPath);
    if (stats.size < cfg.maxBytes) return;
    const todayStamp = this.utcDateStamp(now);
    const rotatedPath = this.firstAvailableRotatedFilePath(cfg, todayStamp);
    renameSync(currentPath, rotatedPath);
  }

  private retentionRegex(cfg: StructuredFileSinkConfig): RegExp {
    const escapedBase = cfg.baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedExt = cfg.extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escapedBase}-(\\d{4}-\\d{2}-\\d{2})(?:\\.\\d+)?${escapedExt}$`);
  }

  private pruneStructuredLogs(cfg: StructuredFileSinkConfig, now: Date): void {
    const today = this.utcDateStamp(now);
    if (this.lastRetentionSweepDate === today) {
      return;
    }
    this.lastRetentionSweepDate = today;

    const todayStartUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const nameRegex = this.retentionRegex(cfg);
    const entries = readdirSync(cfg.directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const match = entry.name.match(nameRegex);
      if (!match) continue;
      const dayStamp = match[1];
      const fileDayUtc = Date.parse(`${dayStamp}T00:00:00.000Z`);
      if (!Number.isFinite(fileDayUtc)) continue;
      const ageInDays = Math.floor((todayStartUtc - fileDayUtc) / DAY_MS);
      if (ageInDays >= cfg.retentionDays) {
        unlinkSync(join(cfg.directory, entry.name));
      }
    }
  }

  private tryAppendStructuredToFile(jsonLine: string): void {
    if (this.structuredFileSinkDisabled) {
      return;
    }
    const cfg = this.structuredFileSinkConfig();
    if (!cfg) {
      return;
    }
    try {
      const now = new Date();
      const filePath = this.currentFilePath(cfg);
      mkdirSync(dirname(filePath), { recursive: true });
      this.rotateIfDayChanged(cfg, filePath, now);
      this.rotateIfSizeExceeded(cfg, filePath, now);
      appendFileSync(filePath, `${jsonLine}\n`, { encoding: 'utf8' });
      if (cfg.retentionDays > 0) {
        this.pruneStructuredLogs(cfg, now);
      }
    } catch {
      this.structuredFileSinkDisabled = true;
    }
  }

  /**
   * One JSON object per line to stdout (CloudWatch) and optionally to the dev file sink.
   * Plain engine logs stay on {@link writeLog} only.
   */
  emitStructured(line: StructuredLogLine): void {
    const jsonLine = JSON.stringify(line);
    console.log(jsonLine);
    this.tryAppendStructuredToFile(jsonLine);
  }
}
export const SIMPLE_LOG_FILE = 'console-only';
