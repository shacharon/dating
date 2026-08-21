import * as fs from 'fs';
import * as path from 'path';

/** Frozen keyword-dump SoT paths (Sprint 52 Story 02 + Sprint 57 enrichment split) — relative to dating-api/src. */
const FROZEN_SRC_RELATIVE_PATHS = [
  'evaluate/enrichment-v2.ts',
  'evaluate/enrichment-keyword-manifest.ts',
  'evaluate/enrichment-keyword-helpers.ts',
  'evaluate/enrichment-interest-keywords.ts',
  'evaluate/enrichment-rhythm-keywords.ts',
  'evaluate/enrichment-conflict-keywords.ts',
  'evaluate/explicit-extended-lists.ts',
  'holy-grail-matching/dealbreaker-signals-text.extract.ts',
  'holy-grail-matching/dealbreaker-taxonomy.ts',
  'holy-grail-matching/lifestyle-signals-text.extract.ts',
  'holy-grail-matching/interest-tags-text.extract.ts',
  'holy-grail-matching/personality-traits-text.extract.ts',
] as const;

const BANNER_MARKER = 'KEYWORD ENGINE FROZEN';

describe('keyword-engine-freeze parity', () => {
  const srcRoot = path.join(__dirname, '..');

  it('keeps frozen SoT files present with FROZEN banners', () => {
    for (const rel of FROZEN_SRC_RELATIVE_PATHS) {
      const abs = path.join(srcRoot, rel);
      expect(fs.existsSync(abs)).toBe(true);
      const head = fs.readFileSync(abs, 'utf8').slice(0, 1200);
      expect(head).toContain(BANNER_MARKER);
    }
  });
});
