/**
 * Regression guard: Sprint 7 Story 1 deleted frozen legacy runtime files must stay gone.
 */
import { existsSync } from 'node:fs';
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
