import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 64 Story 02 — legacy admin stack wiring invariants.
 */
describe('admin-legacy matches wiring (sprint-64 story 02)', () => {
  const srcRoot = path.join(__dirname, '..');

  it('AppModule imports AdminLegacyModule, not MatchesModule', () => {
    const src = fs.readFileSync(path.join(srcRoot, 'app.module.ts'), 'utf8');
    expect(src).toContain('AdminLegacyModule');
    expect(src).not.toMatch(/\bMatchesModule\b/);
  });

  it('LegacyBackendModule imports AdminLegacyMatchesModule', () => {
    const src = fs.readFileSync(
      path.join(srcRoot, 'legacy', 'legacy-backend.module.ts'),
      'utf8',
    );
    expect(src).toContain('AdminLegacyMatchesModule');
    expect(src).not.toMatch(/\bMatchesModule\b/);
  });

  it('legacy MatchesService carries @deprecated JSDoc', () => {
    const src = fs.readFileSync(
      path.join(__dirname, 'matches', 'matches.service.ts'),
      'utf8',
    );
    expect(src).toContain('@deprecated');
    expect(src).toContain('MeMatchesService');
  });

  it('admin legacy controllers keep AuthGuard + AdminGuard', () => {
    for (const rel of ['matches.controller.ts', 'matches-api.controller.ts']) {
      const src = fs.readFileSync(path.join(__dirname, 'matches', rel), 'utf8');
      expect(src).toContain('AuthGuard');
      expect(src).toContain('AdminGuard');
      expect(src).toContain('@deprecated');
    }
  });
});
