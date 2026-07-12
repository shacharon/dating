/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const authState = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'loading' | 'unauthenticated',
  user: {
    id: 'user_me',
    email: 'a@test.com',
    displayName: 'Ada Lovelace',
    avatarUrl: null,
    status: 'ACTIVE' as const,
    emailNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
  },
  logout: vi.fn(),
  lastError: null as string | null,
  clearLastError: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => authState,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dating/profile',
  useSearchParams: () => new URLSearchParams(),
}));

import { NavAuth } from '@/components/nav-auth';
import { enCopy } from '@/lib/i18n/en';
import { esCopy } from '@/lib/i18n/es';
import { heCopy } from '@/lib/i18n/he';

function openAccountMenu(localeLabel: string) {
  fireEvent.click(screen.getByRole('button', { name: localeLabel }));
  return screen.getByRole('menu');
}

describe('NavAuth account menu RTL', () => {
  beforeEach(() => {
    authState.status = 'authenticated';
    authState.user = {
      id: 'user_me',
      email: 'a@test.com',
      displayName: 'Ada Lovelace',
      avatarUrl: null,
      status: 'ACTIVE',
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('sets dir=rtl on the dropdown when locale is Hebrew', () => {
    render(<NavAuth locale="he" />);
    const menu = openAccountMenu(heCopy.navAuth.accountMenuAria);
    expect(menu.getAttribute('dir')).toBe('rtl');
  });

  it('sets dir=ltr on the dropdown for English (default locale)', () => {
    render(<NavAuth />);
    const menu = openAccountMenu(enCopy.navAuth.accountMenuAria);
    expect(menu.getAttribute('dir')).toBe('ltr');
  });

  it('sets dir=ltr on the dropdown when locale is Spanish', () => {
    render(<NavAuth locale="es" />);
    const menu = openAccountMenu(esCopy.navAuth.accountMenuAria);
    expect(menu.getAttribute('dir')).toBe('ltr');
  });

  it('uses text-start on menu items for logical alignment', () => {
    render(<NavAuth locale="he" />);
    openAccountMenu(heCopy.navAuth.accountMenuAria);
    const items = screen.getAllByRole('menuitem');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.className).toContain('text-start');
      expect(item.className).not.toContain('text-left');
      expect(item.className).not.toContain('text-right');
    }
  });
});

describe('NavAuth unauthenticated i18n', () => {
  beforeEach(() => {
    authState.status = 'unauthenticated';
    authState.lastError = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Hebrew sign-in label when locale is he', () => {
    render(<NavAuth locale="he" />);
    expect(
      screen.getByRole('link', { name: heCopy.navAuth.signIn }),
    ).toBeTruthy();
  });
});
