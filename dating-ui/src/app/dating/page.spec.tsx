/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { ReactNode } from 'react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => createElement('a', { href, ...props }, children),
}));

import DatingLandingPage from './dating-page-client';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';

describe('DatingLandingPage i18n', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders English hub copy by default', () => {
    render(<DatingLandingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: enCopy.datingHub.title }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: enCopy.datingHub.getStarted }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: enCopy.datingHub.viewMatches }),
    ).toBeTruthy();
  });

  it('renders Hebrew hub copy when locale is stored', () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<DatingLandingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: heCopy.datingHub.title }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: heCopy.datingHub.getStarted }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: heCopy.datingHub.viewMatches }),
    ).toBeTruthy();
  });
});
