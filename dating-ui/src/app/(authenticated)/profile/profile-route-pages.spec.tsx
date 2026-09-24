/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

vi.mock('@/components/profile/profile-edit-tab', () => ({
  ProfileEditTab: () => <div data-testid="profile-edit-tab">edit</div>,
}));

vi.mock('@/hooks/use-scroll-to-hash-on-mount', () => ({
  useScrollToHashOnMount: () => {},
}));

vi.mock('@/components/profile/profile-quality-refresh-context', () => ({
  useProfileQualityRefresh: () => ({
    refreshKey: 0,
    bumpQualityRefresh: vi.fn(),
  }),
}));

import { ProfileEditPageClient } from '@/app/(authenticated)/profile/edit/profile-edit-page-client';
import { ProfileSettingsPageClient } from '@/app/(authenticated)/profile/settings/profile-settings-page-client';

vi.mock('@/components/profile/profile-settings-tab', () => ({
  ProfileSettingsTab: () => (
    <div data-testid="profile-settings-tab">settings</div>
  ),
}));

describe('profile route page isolation', () => {
  afterEach(() => {
    cleanup();
  });

  it('edit page renders only edit panel', () => {
    render(
      createElement(
        QueryClientTestProvider,
        { client: createTestQueryClient() },
        createElement(ProfileEditPageClient),
      ),
    );
    expect(screen.getByTestId('profile-panel-edit')).toBeTruthy();
    expect(screen.getByTestId('profile-edit-tab')).toBeTruthy();
    expect(screen.queryByTestId('profile-panel-settings')).toBeNull();
    expect(screen.queryByTestId('profile-panel-analysis')).toBeNull();
    expect(screen.queryByTestId('profile-settings-tab')).toBeNull();
  });

  it('settings page renders only settings panel', () => {
    render(
      createElement(
        QueryClientTestProvider,
        { client: createTestQueryClient() },
        createElement(ProfileSettingsPageClient),
      ),
    );
    expect(screen.getByTestId('profile-panel-settings')).toBeTruthy();
    expect(screen.getByTestId('profile-settings-tab')).toBeTruthy();
    expect(screen.queryByTestId('profile-panel-edit')).toBeNull();
    expect(screen.queryByTestId('profile-edit-tab')).toBeNull();
  });
});
