import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect,
}));

import SettingsProfileRedirectPage from './page';

describe('/settings/profile page', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects to /profile', () => {
    SettingsProfileRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile');
  });
});
