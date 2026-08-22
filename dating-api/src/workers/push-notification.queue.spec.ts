import { truncatePushPreview } from './push-notification.queue';

describe('truncatePushPreview', () => {
  it('returns trimmed text when under max', () => {
    expect(truncatePushPreview('  hello  ')).toBe('hello');
  });

  it('truncates to 100 code points with ellipsis', () => {
    const input = 'a'.repeat(105);
    const out = truncatePushPreview(input);
    expect([...out].length).toBe(101); // 100 + …
    expect(out.endsWith('…')).toBe(true);
  });

  it('handles emoji as code points', () => {
    const input = '😀'.repeat(101);
    const out = truncatePushPreview(input, 100);
    expect([...out].slice(0, 100).join('')).toBe('😀'.repeat(100));
    expect(out.endsWith('…')).toBe(true);
  });
});
