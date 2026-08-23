/**
 * Sprint 63 Story 2 + Sprint 65 Story 3 — guard HTTP integration split wiring.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const meProfileDir = path.join(__dirname);
const packageJsonPath = path.join(__dirname, '..', '..', '..', 'package.json');

const BASE_FAMILY_SPECS = [
  'me-profile-http-crud.integration.spec.ts',
  'me-profile-http-conversations.integration.spec.ts',
  'me-profile-http-photos.integration.spec.ts',
] as const;

const MATCHES_SUB_SPECS = [
  'me-profile-http-matches-list-detail.integration.spec.ts',
  'me-profile-http-matches-narrative-feedback.integration.spec.ts',
  'me-profile-http-matches-actions.integration.spec.ts',
  'me-profile-http-matches-mutual.integration.spec.ts',
] as const;

describe('me-profile HTTP integration split wiring', () => {
  it('keeps family specs + matches sub-specs + shared harness; mega-file deleted', () => {
    for (const name of [...BASE_FAMILY_SPECS, ...MATCHES_SUB_SPECS]) {
      expect(fs.existsSync(path.join(meProfileDir, name))).toBe(true);
    }
    expect(
      fs.existsSync(path.join(meProfileDir, 'me-profile-http.shared-harness.ts')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(meProfileDir, 'me-profile-http-matches.integration.spec.ts')),
    ).toBe(false);
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
    for (const name of [...BASE_FAMILY_SPECS, ...MATCHES_SUB_SPECS]) {
      expect(validate).toContain(name);
    }
    expect(validate).not.toContain('me-profile-http-matches.integration.spec.ts');
    expect(validate).not.toContain('me-profile-http.integration.spec.ts');
  });
});
