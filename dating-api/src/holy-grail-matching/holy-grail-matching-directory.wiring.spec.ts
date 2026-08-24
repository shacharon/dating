import fs from 'node:fs';
import path from 'node:path';

const holyGrailDir = path.join(__dirname);

const FEATURE_FOLDERS = ['canonical-mapper', 'decision', 'retrieval'] as const;

describe('holy-grail-matching/ directory layout (Sprint 73 Story 03)', () => {
  it('includes README.md at module root', () => {
    expect(fs.existsSync(path.join(holyGrailDir, 'README.md'))).toBe(true);
  });

  it('keeps expected feature folders', () => {
    for (const dir of FEATURE_FOLDERS) {
      expect(fs.existsSync(path.join(holyGrailDir, dir))).toBe(true);
    }
  });

  it('keeps canonical mapper entry at root (re-export)', () => {
    expect(
      fs.existsSync(path.join(holyGrailDir, 'profile-to-canonical.mapper.ts')),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(holyGrailDir, 'canonical-mapper', 'profile-to-canonical.mapper.ts'),
      ),
    ).toBe(true);
  });

  it('keeps Nest module anchor at root', () => {
    expect(
      fs.existsSync(path.join(holyGrailDir, 'holy-grail-matching.module.ts')),
    ).toBe(true);
  });
});
