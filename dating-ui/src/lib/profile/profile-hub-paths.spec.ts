import { describe, it, expect } from 'vitest';
import {
  PROFILE_HREF,
  pathForLegacyTab,
  profileEditHash,
  profileSectionFromPathname,
  profileSettingsHash,
} from './profile-hub-paths';

describe('profile-hub-paths', () => {
  it('maps legacy tabs to routes', () => {
    expect(pathForLegacyTab('overview')).toBe(PROFILE_HREF.overview);
    expect(pathForLegacyTab('edit')).toBe(PROFILE_HREF.edit);
    expect(pathForLegacyTab('analysis')).toBe(PROFILE_HREF.analysis);
    expect(pathForLegacyTab('settings')).toBe(PROFILE_HREF.settings);
    expect(pathForLegacyTab('other')).toBeNull();
    expect(pathForLegacyTab(null)).toBeNull();
  });

  it('builds edit and settings hash hrefs', () => {
    expect(profileEditHash('photos')).toBe('/profile/edit#photos');
    expect(profileEditHash('preferences')).toBe('/profile/edit#preferences');
    expect(profileSettingsHash('nickname')).toBe('/profile/settings#nickname');
  });

  it('resolves section from pathname', () => {
    expect(profileSectionFromPathname('/profile')).toBe('overview');
    expect(profileSectionFromPathname('/profile/overview')).toBe('overview');
    expect(profileSectionFromPathname('/profile/edit')).toBe('edit');
    expect(profileSectionFromPathname('/profile/analysis')).toBe('analysis');
    expect(profileSectionFromPathname('/profile/settings')).toBe('settings');
  });
});
