import {
  ME_PROFILE_HTTP_CRUD_BASELINE_TEST_COUNT,
  ME_PROFILE_HTTP_CRUD_SPLIT_TEST_COUNTS,
} from './me-profile-http-crud.spec-support';

describe('me-profile-http-crud wiring', () => {
  it('split files document test counts that sum to baseline', () => {
    const sum = Object.values(ME_PROFILE_HTTP_CRUD_SPLIT_TEST_COUNTS).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(ME_PROFILE_HTTP_CRUD_BASELINE_TEST_COUNT);
    expect(ME_PROFILE_HTTP_CRUD_BASELINE_TEST_COUNT).toBe(60);
  });

  it.each(Object.entries(ME_PROFILE_HTTP_CRUD_SPLIT_TEST_COUNTS))(
    '%s expects %i tests',
    (fileName, count) => {
      expect(count).toBeGreaterThan(0);
      expect(fileName).toMatch(/.integration.spec.ts$/);
    },
  );
});
