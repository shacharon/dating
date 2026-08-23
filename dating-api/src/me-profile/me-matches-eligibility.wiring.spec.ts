/**
 * Sprint 69 Story 04 — guard eligibility harness decomposition wiring.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const meProfileDir = __dirname;

const HARNESS_MODULES = [
  'me-matches-eligibility.fixtures.ts',
  'me-matches-eligibility.builders.ts',
  'me-matches-eligibility.prisma-mock.ts',
  'me-matches-eligibility.harness.ts',
  'me-matches-eligibility.spec-support.ts',
  'me-matches-eligibility-spec-size.policy.spec.ts',
] as const;

const E2E_SPECS = [
  'me-new-model-e2e-eligibility.integration.spec.ts',
  'me-new-model-e2e-ranking.integration.spec.ts',
  'me-new-model-e2e-pagination.integration.spec.ts',
  'me-new-model-e2e-match-narrative.integration.spec.ts',
  'me-new-model-e2e-dealbreaker.integration.spec.ts',
  'me-new-model-e2e-dealbreaker-guardrails.integration.spec.ts',
  'me-new-model-e2e-hard-block-existing.integration.spec.ts',
  'me-new-model-e2e-photo-moderation.integration.spec.ts',
] as const;

describe('me-matches-eligibility harness wiring', () => {
  it('split modules exist; spec-support stays a thin barrel', () => {
    for (const name of HARNESS_MODULES) {
      expect(fs.existsSync(path.join(meProfileDir, name))).toBe(true);
    }
    const barrel = fs.readFileSync(
      path.join(meProfileDir, 'me-matches-eligibility.spec-support.ts'),
      'utf8',
    );
    expect(barrel).not.toMatch(/class EligibilityTestHarness/);
    expect(barrel).not.toMatch(/buildEligibilityPrismaMock/);
    expect(barrel).toMatch(
      /from '\.\/me-matches-eligibility\.harness'/,
    );
  });

  it('e2e specs keep importing ./me-matches-eligibility.spec-support', () => {
    for (const name of E2E_SPECS) {
      const content = fs.readFileSync(path.join(meProfileDir, name), 'utf8');
      expect(content).toMatch(
        /from '\.\/me-matches-eligibility\.spec-support'/,
      );
    }
  });
});
