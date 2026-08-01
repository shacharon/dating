/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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
});
