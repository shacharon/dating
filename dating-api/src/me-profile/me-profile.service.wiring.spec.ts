import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ME_PROFILE_SERVICE_BASELINE_TEST_COUNT,
  ME_PROFILE_SERVICE_SPLIT_TEST_COUNTS,
} from './me-profile.service.spec-support';

const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');

describe('me-profile.service wiring', () => {
  it('split files document test counts that sum to baseline', () => {
    const sum = Object.values(ME_PROFILE_SERVICE_SPLIT_TEST_COUNTS).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(ME_PROFILE_SERVICE_BASELINE_TEST_COUNT);
    expect(ME_PROFILE_SERVICE_BASELINE_TEST_COUNT).toBe(58);
  });

  it.each(Object.entries(ME_PROFILE_SERVICE_SPLIT_TEST_COUNTS))(
    '%s expects %i tests',
    (fileName, count) => {
      expect(count).toBeGreaterThan(0);
      expect(fileName).toMatch(/\.spec\.ts$/);
    },
  );

  it('points validate:phase2-me-profile at split service specs', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    const validate = pkg.scripts['validate:phase2-me-profile'];
    for (const name of Object.keys(ME_PROFILE_SERVICE_SPLIT_TEST_COUNTS)) {
      expect(validate).toContain(name);
    }
    expect(validate).toContain('me-profile.service.wiring.spec.ts');
    expect(validate).toContain('me-profile.service-spec-size.policy.spec.ts');
    expect(validate).not.toContain('me-profile.service.spec.ts');
  });
});
