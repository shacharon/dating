import { recordQueueEvent } from './custom-metrics';

describe('recordQueueEvent', () => {
  it('emits queue.event custom_metric JSON line', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      recordQueueEvent('profile-analysis', 'coalesced');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('"metric":"queue.event"'),
      );
      const line = JSON.parse(String(spy.mock.calls[0][0]));
      expect(line).toMatchObject({
        event: 'custom_metric',
        metric: 'queue.event',
        value: 1,
        tags: ['queue:profile-analysis', 'event:coalesced'],
      });
    } finally {
      spy.mockRestore();
    }
  });
});
