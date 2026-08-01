import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect,
}));

import SettingsProfileStoryRedirectPage from './page';

describe('/settings/profile/story page', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects to /profile?tab=edit#story', () => {
    SettingsProfileStoryRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile?tab=edit#story');
  });
});
