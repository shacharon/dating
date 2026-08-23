import {
  ME_PROFILE_SERVICE_BASELINE_TEST_COUNT,
  ME_PROFILE_SERVICE_SPLIT_TEST_COUNTS,
} from './me-profile.service.spec-support';

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
});
