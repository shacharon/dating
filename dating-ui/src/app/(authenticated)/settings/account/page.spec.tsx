/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import SettingsAccountPage from '@/app/(authenticated)/settings/account/account-page-client';

describe('SettingsAccountPage', () => {
  it('links to privacy, terms, support, and notification preferences', () => {
    render(<SettingsAccountPage />);
    expect(screen.getByTestId('account-link-privacy').getAttribute('href')).toBe(
      '/privacy',
    );
    expect(screen.getByTestId('account-link-terms').getAttribute('href')).toBe(
      '/terms',
    );
    expect(screen.getByTestId('account-link-support').getAttribute('href')).toBe(
      '/support',
    );
    expect(
      screen.getByTestId('account-link-notifications').getAttribute('href'),
    ).toBe('/profile?tab=settings#notifications');
    expect(screen.getByTestId('delete-account-section')).toBeTruthy();
  });
});
