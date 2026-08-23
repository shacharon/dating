import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const matchesDir = path.join(__dirname);
const apiRoot = path.join(__dirname, '../..');

function countFilesRecursive(dir: string): number {
  let count = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) count += countFilesRecursive(full);
    else count += 1;
  }
  return count;
}

function featureDirs(): string[] {
  return fs
    .readdirSync(matchesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

describe('matches/ directory layout (Sprint 70)', () => {
  it('keeps root file count at or below 15', () => {
    const rootFiles = fs.readdirSync(matchesDir, { withFileTypes: true }).filter((f) => f.isFile());
    expect(rootFiles.length).toBeLessThanOrEqual(15);
  });

  it('includes README.md at module root', () => {
    expect(fs.existsSync(path.join(matchesDir, 'README.md'))).toBe(true);
  });

  it('keeps each feature folder at or below 25 files', () => {
    const caps: Array<{ label: string; dir: string }> = [];
    for (const dir of featureDirs()) {
      if (dir === 'explainability') {
        caps.push(
          { label: 'explainability/core', dir: 'explainability/core' },
          { label: 'explainability/expansions/01-07', dir: 'explainability/expansions/01-07' },
          { label: 'explainability/expansions/10-15', dir: 'explainability/expansions/10-15' },
        );
        continue;
      }
      caps.push({ label: dir, dir });
    }
    for (const { label, dir } of caps) {
      const fileCount = countFilesRecursive(path.join(matchesDir, dir));
      expect(fileCount).toBeLessThanOrEqual(25);
    }
  });

  it('does not leave moved engine files at root', () => {
    const orphaned = ['match-engine.ts', 'scoring.ts', 'friction-policy.ts', 'match-teaser.ts'];
    for (const name of orphaned) {
      expect(fs.existsSync(path.join(matchesDir, name))).toBe(false);
    }
  });

  it('points smoke:matches at api smoke spec', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['smoke:matches']).toContain('api/matches-api-smoke.integration.spec.ts');
  });

  it('has no stale root-level match-engine import paths in src', () => {
    const out = execSync('git grep -l "matches/match-engine" -- src || exit 0', {
      cwd: apiRoot,
      encoding: 'utf8',
    }).trim();
    expect(out).toBe('');
  });

  it('has no stale pre-move matches/ import paths in src', () => {
    const stalePatterns = [
      'matches/match-teaser',
      'matches/friction-policy',
      'matches/match-explainability',
      'matches/expansion-10-explainability',
      'matches/compare-stages/',
      'matches/admin-pair-match',
    ];
    for (const pattern of stalePatterns) {
      const out = execSync(`git grep -l "${pattern}" -- src || exit 0`, {
        cwd: apiRoot,
        encoding: 'utf8',
      }).trim();
      expect(out).toBe('');
    }
  });

  it('keeps match-narrative at matches/match-narrative/', () => {
    expect(fs.existsSync(path.join(matchesDir, 'match-narrative', 'index.ts'))).toBe(true);
  });
});
