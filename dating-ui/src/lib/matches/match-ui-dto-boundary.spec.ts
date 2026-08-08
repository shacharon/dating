/**
 * Boundary guard: browse/detail production modules must not import list/detail DTOs.
 * Transport types stay in me-matches-api + mappers only.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');

const BROWSE_DIR = join(ROOT, 'app/dating/me-matches');
const DETAIL_DIR = join(ROOT, 'components/match-detail');

const FORBIDDEN =
  /\b(MeMatchItemDto|MeMatchDetailDto|MeMatchesListDto|HardBlockedDto)\b/;

function listTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'handoffs') return [];
      return listTsFiles(full);
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.spec\.(ts|tsx)$/.test(entry.name)) return [];
    return [full];
  });
}

describe('match UI DTO boundary', () => {
  it('browse/detail production files do not import list/detail DTOs', () => {
    const files = [...listTsFiles(BROWSE_DIR), ...listTsFiles(DETAIL_DIR)];
    const offenders: string[] = [];

    for (const file of files) {
      // Fetch boundary + action transport are allowed to import the API module,
      // but must not type props/state as list/detail DTOs.
      const rel = file.replace(/\\/g, '/');
      if (
        rel.endsWith('/use-infinite-matches.ts') ||
        rel.endsWith('/[id]/page.tsx') ||
        rel.endsWith('/match-detail-block-report.tsx')
      ) {
        const src = readFileSync(file, 'utf8');
        if (FORBIDDEN.test(src)) offenders.push(rel);
        continue;
      }
      const src = readFileSync(file, 'utf8');
      if (FORBIDDEN.test(src)) offenders.push(rel);
    }

    expect(offenders).toEqual([]);
  });
});
