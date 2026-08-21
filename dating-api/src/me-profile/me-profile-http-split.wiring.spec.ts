/**
 * Sprint 63 Story 2 — guard that the HTTP mega-suite split stays wired.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const meProfileDir = path.join(__dirname);
const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');

const FAMILY_SPECS = [
  'me-profile-http-crud.integration.spec.ts',
  'me-profile-http-matches.integration.spec.ts',
  'me-profile-http-conversations.integration.spec.ts',
  'me-profile-http-photos.integration.spec.ts',
] as const;

describe('me-profile HTTP integration split wiring', () => {
  it('keeps the four family specs + shared harness and deletes the mega-file', () => {
    for (const name of FAMILY_SPECS) {
      expect(fs.existsSync(path.join(meProfileDir, name))).toBe(true);
    }
    expect(
      fs.existsSync(path.join(meProfileDir, 'me-profile-http.shared-harness.ts')),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(meProfileDir, 'me-profile-http.integration.spec.ts'),
      ),
    ).toBe(false);
  });

  it('points smoke + phase2 validate scripts at the split suites', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['smoke:me-profile']).toContain('me-profile-http-');
    expect(pkg.scripts['smoke:me-profile']).not.toContain(
      'me-profile-http.integration.spec.ts',
    );
    const validate = pkg.scripts['validate:phase2-me-profile'];
    for (const name of FAMILY_SPECS) {
      expect(validate).toContain(name);
    }
    expect(validate).not.toContain('me-profile-http.integration.spec.ts');
  });
});
