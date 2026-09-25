/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { enCopy } from '@/lib/i18n/en';

const replaceMock = vi.hoisted(() => vi.fn());
let mockSearch = '';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    prefetch: vi.fn(),
  }),
}));

import { LegacyProfileTabRedirect } from '@/components/profile/legacy-profile-tab-redirect';

describe('LegacyProfileTabRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = '';
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('renders children when no tab query', () => {
    render(
      createElement(
        LegacyProfileTabRedirect,
        null,
        createElement('div', { 'data-testid': 'child' }, 'ok'),
      ),
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects settings tab with hash', async () => {
    mockSearch = 'tab=settings';
    window.location.hash = '#nickname';
    render(
      createElement(
        LegacyProfileTabRedirect,
        null,
        createElement('div', { 'data-testid': 'child' }, 'ok'),
      ),
    );
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/profile/settings#nickname');
    });
    expect(screen.queryByTestId('child')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(
      enCopy.common.loading,
    );
  });

  it('strips unknown tab to overview', async () => {
    mockSearch = 'tab=nope';
    window.location.hash = '#x';
    render(createElement(LegacyProfileTabRedirect, null, null));
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/profile/overview#x');
    });
  });

  it('strips tab=overview query', async () => {
    mockSearch = 'tab=overview';
    render(createElement(LegacyProfileTabRedirect, null, null));
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/profile/overview');
    });
  });
});
