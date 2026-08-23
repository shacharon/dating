import { describe, expect, it } from 'vitest';
import config from './capacitor.config';

describe('capacitor.config', () => {
  it('uses the Dating app identity', () => {
    expect(config.appId).toBe('com.dating.app');
    expect(config.appName).toBe('Dating');
  });

  it('points webDir at Next export output', () => {
    expect(config.webDir).toBe('out');
  });

  it('sets androidScheme without remote server.url', () => {
    expect(config.server?.androidScheme).toBe('https');
    expect(config.server?.url).toBeUndefined();
    expect(config.server?.cleartext).toBeUndefined();
  });
});
