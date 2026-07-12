/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { listMyProfilePhotosMock } = vi.hoisted(() => ({
  listMyProfilePhotosMock: vi.fn(),
}));

vi.mock('@/lib/me-profile-api', () => ({
  listMyProfilePhotos: listMyProfilePhotosMock,
}));

import { PhotoGateBanner } from '@/components/photo-gate-banner';

describe('PhotoGateBanner', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows banner when user has no approved photos', async () => {
    listMyProfilePhotosMock.mockResolvedValue([
      { id: 'p1', status: 'PENDING', position: 0, isPrimary: false },
    ]);

    render(<PhotoGateBanner />);

    await waitFor(() => {
      expect(screen.getByTestId('photo-gate-banner')).toBeTruthy();
    });
    expect(screen.getByText('Add a photo to see matches')).toBeTruthy();
  });

  it('hides banner when user has an approved photo', async () => {
    listMyProfilePhotosMock.mockResolvedValue([
      { id: 'p1', status: 'APPROVED', position: 0, isPrimary: true },
    ]);

    render(<PhotoGateBanner />);

    await waitFor(() => {
      expect(listMyProfilePhotosMock).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('photo-gate-banner')).toBeNull();
  });
});
