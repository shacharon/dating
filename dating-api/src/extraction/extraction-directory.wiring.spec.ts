import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const extractionDir = path.join(__dirname);
const apiRoot = path.join(__dirname, '../..');

const FEATURE_FOLDERS = ['core', 'prompt', 'expansion', 'shadow', 'pipeline'] as const;

function countFiles(dir: string): number {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile())
    .length;
}

describe('extraction/ directory layout (Sprint 73 Story 01)', () => {
  it('keeps root file count at or below 15', () => {
    const rootFiles = fs
      .readdirSync(extractionDir, { withFileTypes: true })
      .filter((f) => f.isFile());
    expect(rootFiles.length).toBeLessThanOrEqual(15);
  });

  it('includes README.md at module root', () => {
    expect(fs.existsSync(path.join(extractionDir, 'README.md'))).toBe(true);
  });

  it('keeps each feature folder at or below 25 files', () => {
    for (const dir of FEATURE_FOLDERS) {
      const fileCount = countFiles(path.join(extractionDir, dir));
      expect({ dir, fileCount }).toEqual({
        dir,
        fileCount: expect.any(Number),
      });
      expect(fileCount).toBeLessThanOrEqual(25);
    }
  });

  it('does not leave moved expansion or core files at root', () => {
    const orphaned = [
      'expansion-manifest.ts',
      'extraction-prompt.builder.ts',
      'extraction-normalization.ts',
      'pipeline-trace.ts',
      'extraction-strict-validation.ts',
    ];
    for (const name of orphaned) {
      expect(fs.existsSync(path.join(extractionDir, name))).toBe(false);
    }
  });

  it('keeps Nest + public DTO anchors at root', () => {
    for (const name of [
      'extraction.service.ts',
      'extraction-core.module.ts',
      'extracted-signals.interface.ts',
      'extracted-interests.interface.ts',
    ]) {
      expect(fs.existsSync(path.join(extractionDir, name))).toBe(true);
    }
  });

  it('has no stale root-level pipeline-trace import paths in src', () => {
    const out = execSync(
      'git grep -l "extraction/pipeline-trace" -- src || exit 0',
      {
        cwd: apiRoot,
        encoding: 'utf8',
      },
    ).trim();
    expect(out).toBe('');
  });

  it('has no stale root-level expansion-manifest import paths in src', () => {
    const out = execSync(
      'git grep -l "extraction/expansion-manifest" -- src || exit 0',
      {
        cwd: apiRoot,
        encoding: 'utf8',
      },
    ).trim();
    // Comment-only mentions may remain in docs; src should use expansion/ path
    expect(out).toBe('');
  });
});
