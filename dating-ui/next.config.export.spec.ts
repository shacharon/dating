/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('next.config export gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadConfig() {
    return (await import('./next.config')).default;
  }

  it('uses standalone output and rewrites by default', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    delete process.env.CAPACITOR_BUILD;

    const config = await loadConfig();
    expect(config.output).toBe('standalone');
    expect(config.rewrites).toBeTypeOf('function');
    expect(config.images?.unoptimized).toBeUndefined();
  });

  it('uses export output without rewrites when CAPACITOR_BUILD=1', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CAPACITOR_BUILD', '1');

    const config = await loadConfig();
    expect(config.output).toBe('export');
    expect(config.rewrites).toBeUndefined();
    expect(config.images?.unoptimized).toBe(true);
  });
});
