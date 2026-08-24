import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const libDir = path.join(__dirname);
const uiRoot = path.join(__dirname, '../..');

const FEATURE_FOLDERS = [
  'api',
  'admin',
  'messaging',
  'profile',
  'platform',
  'query',
  'moderation',
  'referral',
  'auth',
  'matches',
] as const;

function countFiles(dir: string): number {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile())
    .length;
}

describe('lib/ directory layout (Sprint 73 Story 02)', () => {
  it('keeps root file count at or below 25', () => {
    const rootFiles = fs
      .readdirSync(libDir, { withFileTypes: true })
      .filter((f) => f.isFile());
    expect(rootFiles.length).toBeLessThanOrEqual(25);
  });

  it('includes README.md at module root', () => {
    expect(fs.existsSync(path.join(libDir, 'README.md'))).toBe(true);
  });

  it('keeps each feature folder at or below 25 files', () => {
    for (const dir of FEATURE_FOLDERS) {
      const fileCount = countFiles(path.join(libDir, dir));
      expect(fileCount).toBeLessThanOrEqual(25);
    }
  });

  it('locks expected domain folder file counts', () => {
    expect(countFiles(path.join(libDir, 'api'))).toBe(19);
    expect(countFiles(path.join(libDir, 'admin'))).toBe(11);
    expect(countFiles(path.join(libDir, 'messaging'))).toBe(17);
    expect(countFiles(path.join(libDir, 'profile'))).toBe(11);
    expect(countFiles(path.join(libDir, 'platform'))).toBe(13);
    expect(countFiles(path.join(libDir, 'query'))).toBe(5);
    expect(countFiles(path.join(libDir, 'moderation'))).toBe(2);
    expect(countFiles(path.join(libDir, 'referral'))).toBe(2);
    expect(countFiles(path.join(libDir, 'auth'))).toBe(21);
    expect(countFiles(path.join(libDir, 'matches'))).toBe(19);
  });

  it('does not leave moved api-base or token-storage at root', () => {
    for (const name of ['api-base.ts', 'token-storage.ts', 'me-profile-api.ts']) {
      expect(fs.existsSync(path.join(libDir, name))).toBe(false);
    }
  });

  it('has no stale root-level @/lib/api-base imports in dating-ui/src', () => {
    const out = execSync(
      'git grep -n "@/lib/api-base" -- dating-ui/src || exit 0',
      {
        cwd: path.join(uiRoot, '..'),
        encoding: 'utf8',
      },
    )
      .trim()
      .split(/\r?\n/)
      .filter(
        (line) =>
          line.length > 0 &&
          !line.includes('@/lib/api/api-base') &&
          !line.includes('lib-directory.wiring'),
      );
    expect(out).toEqual([]);
  });
});
