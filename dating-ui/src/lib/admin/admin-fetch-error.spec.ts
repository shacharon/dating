import { describe, expect, it } from 'vitest';
import { messageFromAdminFetchError } from './admin-fetch-error';

describe('messageFromAdminFetchError', () => {
  it('maps admin_forbidden', () => {
    expect(
      messageFromAdminFetchError(new Error('admin_forbidden'), {
        forbiddenMessage: 'No access',
        fallbackMessage: 'Failed',
      }),
    ).toBe('No access');
  });

  it('uses Error.message when present', () => {
    expect(
      messageFromAdminFetchError(new Error('boom'), {
        forbiddenMessage: 'No access',
        fallbackMessage: 'Failed',
      }),
    ).toBe('boom');
  });

  it('uses fallback for unknown', () => {
    expect(
      messageFromAdminFetchError('x', {
        forbiddenMessage: 'No access',
        fallbackMessage: 'Failed',
      }),
    ).toBe('Failed');
  });
});
