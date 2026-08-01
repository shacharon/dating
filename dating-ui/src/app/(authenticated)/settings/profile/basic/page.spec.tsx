import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect,
}));

import SettingsProfileBasicRedirectPage from './page';

describe('/settings/profile/basic page', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects to /profile?tab=edit#basic', () => {
    SettingsProfileBasicRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile?tab=edit#basic');
  });
});
