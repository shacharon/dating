/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  REFERRAL_STORAGE_KEY,
  buildInviteUrl,
  captureReferralFromSearchParams,
  clearStoredReferralRef,
  isValidReferralRefFormat,
  readStoredReferralRef,
  writeStoredReferralRef,
} from './referral-attribution';

describe('referral-attribution', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('validates cuid-like referrer ids', () => {
    expect(isValidReferralRefFormat('c123456789012345678901234')).toBe(true);
    expect(isValidReferralRefFormat('test')).toBe(false);
    expect(isValidReferralRefFormat('')).toBe(false);
  });

  it('captures ref from search params into sessionStorage', () => {
    const ref = 'c123456789012345678901234';
    const params = new URLSearchParams(`ref=${ref}`);
    expect(captureReferralFromSearchParams(params)).toBe(true);
    expect(sessionStorage.getItem(REFERRAL_STORAGE_KEY)).toBe(ref);
    expect(readStoredReferralRef()).toBe(ref);
  });

  it('buildInviteUrl includes ref query param', () => {
    const ref = 'c123456789012345678901234';
    expect(buildInviteUrl('http://localhost:3000', ref)).toBe(
      `http://localhost:3000/?ref=${encodeURIComponent(ref)}`,
    );
  });

  it('clearStoredReferralRef removes stored value', () => {
    writeStoredReferralRef('c123456789012345678901234');
    clearStoredReferralRef();
    expect(readStoredReferralRef()).toBeNull();
  });
});
