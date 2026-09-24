/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { enCopy } from '@/lib/i18n/en';

let mockPathname = '/profile';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

import { ProfileHubNav } from '@/components/profile/profile-hub-nav';

describe('ProfileHubNav', () => {
  afterEach(() => {
    cleanup();
  });

  it('marks edit as current page and uses route hrefs', () => {
    mockPathname = '/profile/edit';
    render(createElement(ProfileHubNav, { copy: enCopy.profile.hub }));
    const edit = screen.getByTestId('profile-tab-edit');
    expect(edit.getAttribute('aria-current')).toBe('page');
    expect(edit.getAttribute('href')).toBe('/profile/edit');
    expect(edit.className).toMatch(/focus-visible:outline/);
    expect(
      screen.getByTestId('profile-tab-overview').getAttribute('aria-current'),
    ).toBeNull();
    expect(
      screen.getByTestId('profile-tab-settings').getAttribute('href'),
    ).toBe('/profile/settings');
  });

  it('marks overview only for exact /profile', () => {
    mockPathname = '/profile';
    render(createElement(ProfileHubNav, { copy: enCopy.profile.hub }));
    expect(
      screen.getByTestId('profile-tab-overview').getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByTestId('profile-tab-edit').getAttribute('aria-current'),
    ).toBeNull();
  });
});
