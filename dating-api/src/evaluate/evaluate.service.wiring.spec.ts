import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  EVALUATE_SERVICE_BASELINE_TEST_COUNT,
  EVALUATE_SERVICE_SPLIT_TEST_COUNTS,
} from './evaluate.service.spec-support';

const evaluateDir = __dirname;

describe('evaluate.service wiring', () => {
  it('split files exist and monolith deleted', () => {
    for (const name of Object.keys(EVALUATE_SERVICE_SPLIT_TEST_COUNTS)) {
      expect(fs.existsSync(path.join(evaluateDir, name))).toBe(true);
    }
    expect(
      fs.existsSync(path.join(evaluateDir, 'evaluate.service.spec-support.ts')),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(evaluateDir, 'evaluate.service-spec-size.policy.spec.ts'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(evaluateDir, 'evaluate.service.spec.ts')),
    ).toBe(false);
  });

  it('split files document test counts that sum to baseline', () => {
    const sum = Object.values(EVALUATE_SERVICE_SPLIT_TEST_COUNTS).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(EVALUATE_SERVICE_BASELINE_TEST_COUNT);
    expect(EVALUATE_SERVICE_BASELINE_TEST_COUNT).toBe(17);
  });

  it.each(Object.entries(EVALUATE_SERVICE_SPLIT_TEST_COUNTS))(
    '%s expects %i tests',
    (fileName, count) => {
      expect(count).toBeGreaterThan(0);
      expect(fileName).toMatch(/\.spec\.ts$/);
    },
  );
});
