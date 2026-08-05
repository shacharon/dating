/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { listMyProfilePhotos } = vi.hoisted(() => ({
  listMyProfilePhotos: vi.fn(),
}));

vi.mock('@/lib/me-photos-api', () => ({
  listMyProfilePhotos,
}));

vi.mock('@/lib/i18n', () => ({
  useAppLocale: () => ({
    copy: {
      matches: {
        list: {
          photoGate: {
            title: 'Add a photo to see matches',
            body: 'You need at least one approved photo before we can show people here.',
            bodyPending:
              "Your photo is still under review. Once it's approved, matches will appear here.",
            cta: 'Go to photos',
            whyToggle: 'Why do I need a photo?',
            whyBody:
              'A photo helps others recognize you and keeps the community safer.',
          },
        },
      },
    },
  }),
}));

vi.mock('next/link', () => ({
  default({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

import { MatchListPhotoGate } from './match-list-photo-gate';

describe('MatchListPhotoGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows default body when there are no pending photos', async () => {
    listMyProfilePhotos.mockResolvedValue([]);
    render(<MatchListPhotoGate />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'You need at least one approved photo before we can show people here.',
        ),
      ).toBeTruthy();
    });
    expect(screen.getByTestId('match-photo-gate-cta').getAttribute('href')).toBe(
      '/profile?tab=edit#photos',
    );
  });

  it('shows pending body when a photo is PENDING', async () => {
    listMyProfilePhotos.mockResolvedValue([{ id: 'p1', status: 'PENDING' }]);
    render(<MatchListPhotoGate />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Your photo is still under review. Once it's approved, matches will appear here.",
        ),
      ).toBeTruthy();
    });
  });

  it('expands why-a-photo copy without fake stats', async () => {
    listMyProfilePhotos.mockResolvedValue([]);
    render(<MatchListPhotoGate />);

    await waitFor(() => {
      expect(screen.getByTestId('match-photo-gate-why')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('match-photo-gate-why'));
    expect(screen.getByTestId('match-photo-gate-why-body').textContent).toContain(
      'keeps the community safer',
    );
    expect(screen.getByTestId('match-photo-gate-why-body').textContent).not.toMatch(
      /10x/i,
    );
  });
});
