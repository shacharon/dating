import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect,
}));

import DatingProfileRedirectPage from './dating/profile/page';
import DatingAnalysisRedirectPage from './dating/analysis/page';
import SettingsProfileRedirectPage from './(authenticated)/settings/profile/page';
import SettingsProfileBasicRedirectPage from './(authenticated)/settings/profile/basic/page';
import SettingsProfileStoryRedirectPage from './(authenticated)/settings/profile/story/page';

describe('profile route redirects (Story 35.4)', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('/dating/profile → /profile', () => {
    DatingProfileRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile');
  });

  it('/dating/analysis → /profile/analysis', () => {
    DatingAnalysisRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile/analysis');
  });

  it('/settings/profile → /profile', () => {
    SettingsProfileRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile');
  });

  it('/settings/profile/basic → /profile/edit#basic', () => {
    SettingsProfileBasicRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile/edit#basic');
  });

  it('/settings/profile/story → /profile/edit#story', () => {
    SettingsProfileStoryRedirectPage();
    expect(redirect).toHaveBeenCalledWith('/profile/edit#story');
  });
});
