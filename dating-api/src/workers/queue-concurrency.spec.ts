import {
  PHOTO_MODERATION_QUEUE_CONCURRENCY_ENV,
  PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV,
  QUEUE_CONCURRENCY_DEFAULT,
  resolveQueueConcurrency,
} from './queue-concurrency';

describe('resolveQueueConcurrency', () => {
  it('defaults when unset', () => {
    expect(resolveQueueConcurrency(PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV, 1, {})).toBe(
      QUEUE_CONCURRENCY_DEFAULT,
    );
  });

  it('rejects invalid values', () => {
    expect(
      resolveQueueConcurrency(PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV, 1, {
        [PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV]: '0',
      }),
    ).toBe(1);
    expect(
      resolveQueueConcurrency(PHOTO_MODERATION_QUEUE_CONCURRENCY_ENV, 1, {
        [PHOTO_MODERATION_QUEUE_CONCURRENCY_ENV]: 'abc',
      }),
    ).toBe(1);
  });

  it('accepts finite positive concurrency', () => {
    expect(
      resolveQueueConcurrency(PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV, 1, {
        [PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV]: '3',
      }),
    ).toBe(3);
  });
});
