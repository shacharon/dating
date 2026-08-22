import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 64 Story 02 — product match stack must not depend on quarantined admin legacy.
 */
describe('me-profile admin-legacy boundary (sprint-64 story 02)', () => {
  const meProfileRoot = __dirname;
  const srcRoot = path.join(__dirname, '..');
  const matchesRoot = path.join(srcRoot, 'matches');

  const collectTsFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        out.push(...collectTsFiles(full));
        continue;
      }
      if (name.endsWith('.ts')) out.push(full);
    }
    return out;
  };

  it('me-profile sources never import admin-legacy', () => {
    const hits: string[] = [];
    for (const file of collectTsFiles(meProfileRoot)) {
      if (file.endsWith('.spec.ts')) continue;
      const rel = path.relative(meProfileRoot, file).replace(/\\/g, '/');
      const text = fs.readFileSync(file, 'utf8');
      if (/from ['"].*admin-legacy/.test(text) || text.includes('admin-legacy/')) {
        hits.push(rel);
      }
    }
    expect(hits).toEqual([]);
  });

  it('me-profile sources never reference legacy MatchesService', () => {
    const hits: string[] = [];
    for (const file of collectTsFiles(meProfileRoot)) {
      if (file.endsWith('.spec.ts')) continue;
      const rel = path.relative(meProfileRoot, file).replace(/\\/g, '/');
      const text = fs.readFileSync(file, 'utf8');
      if (
        /from ['"].*\/matches\/matches\.service['"]/.test(text) ||
        /\bMatchesService\b/.test(text)
      ) {
        hits.push(rel);
      }
    }
    expect(hits).toEqual([]);
  });

  it('shared matches/ has no HTTP controllers or MatchesModule', () => {
    const controllerHits = collectTsFiles(matchesRoot).filter((f) =>
      f.endsWith('.controller.ts'),
    );
    expect(controllerHits.map((f) => path.basename(f))).toEqual([]);

    expect(
      fs.existsSync(path.join(matchesRoot, 'matches.module.ts')),
    ).toBe(false);
  });
});
