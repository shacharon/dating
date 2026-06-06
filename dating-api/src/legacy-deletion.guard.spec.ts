/**
 * Regression guard: Sprint 7 Story 1 deleted frozen legacy runtime files must stay gone.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const API_ROOT = join(__dirname, '..');
const REPO_ROOT = join(API_ROOT, '..');

const DELETED_API_PATHS = [
  'src/profiles/profiles-analyze.controller.ts',
  'src/profiles/analysis-cache.service.ts',
  'src/profiles/analyze-failures-persistence.service.ts',
  'src/extraction/extraction.module.ts',
  'src/extraction/extraction-v2-persistence.service.ts',
  'src/extraction/extraction-v2.service.ts',
  'src/extraction/interests-extraction.service.ts',
  'src/extraction/negatives-extraction.service.ts',
  'src/evaluate/chips-layer-builder.ts',
  'src/canonical/canonical-projection.ts',
  'src/canonical/canonical-profile.repository.ts',
  'src/holy-grail-matching/holy-grail-ranking-signals-sync.ts',
  'src/validate-v1-v2.ts',
];

const DELETED_UI_PATHS = [
  'dating-ui/src/app/poc/page.tsx',
  'dating-ui/src/app/poc/evaluate/page.tsx',
];

describe('Sprint 7 Story 1 legacy deletion guard', () => {
  it.each(DELETED_API_PATHS)('API file removed: %s', (rel) => {
    expect(existsSync(join(API_ROOT, rel))).toBe(false);
  });

  it.each(DELETED_UI_PATHS)('UI POC file removed: %s', (rel) => {
    expect(existsSync(join(REPO_ROOT, rel))).toBe(false);
  });
});

/** Regression guard: Sprint 7 Story 2 — retired scripts stay archived; CI workflow stays deleted. */
const ARCHIVED_SCRIPT_ROOT = 'scripts/archive/retired-matchmaking-profile';

const SCRIPTS_MOVED_TO_ARCHIVE = [
  'scripts/analyze-all.ts',
  'scripts/ci-seed-hg-validation-minimal.ts',
  'scripts/hg-ranking-signal-ci-guard.ts',
  'scripts/seed-lifestyle-v2-validation.ts',
  'scripts/validate-lifestyle-signals-v2.ts',
];

describe('Sprint 7 Story 2 legacy retirement guard', () => {
  it('HG ranking CI workflow removed', () => {
    expect(
      existsSync(
        join(REPO_ROOT, '.github/workflows/hg-ranking-signal-guard.yml'),
      ),
    ).toBe(false);
  });

  it('package.json has no DEPRECATED MatchmakingProfile stub scripts', () => {
    const pkg = readFileSync(join(API_ROOT, 'package.json'), 'utf8');
    expect(pkg).not.toMatch(/DEPRECATED.*MatchmakingProfile/);
    expect(pkg).not.toMatch(/ci:hg-ranking-guard/);
  });

  it.each(SCRIPTS_MOVED_TO_ARCHIVE)(
    'script archived (not in scripts/ root): %s',
    (rel) => {
      expect(existsSync(join(API_ROOT, rel))).toBe(false);
      const base = rel.replace('scripts/', '');
      expect(existsSync(join(API_ROOT, ARCHIVED_SCRIPT_ROOT, base))).toBe(true);
    },
  );
});
