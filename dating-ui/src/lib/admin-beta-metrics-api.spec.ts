/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { formatRatePct } from './admin-beta-metrics-api';

describe('formatRatePct', () => {
  it('formats null and fractions', () => {
    expect(formatRatePct(null)).toBe('—');
    expect(formatRatePct(0.4)).toBe('40%');
    expect(formatRatePct(0.333)).toBe('33.3%');
  });
});
