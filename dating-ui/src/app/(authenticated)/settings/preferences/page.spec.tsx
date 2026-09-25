import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect,
}));

import SettingsPreferencesRedirectPage from './page';

describe('/settings/preferences page', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects to /profile/edit#preferences', () => {
    SettingsPreferencesRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile/edit#preferences');
  });
});
