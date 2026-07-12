/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { listMyProfilePhotosMock } = vi.hoisted(() => ({
  listMyProfilePhotosMock: vi.fn(),
}));

vi.mock('@/lib/me-profile-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/me-profile-api')>();
  return {
    ...actual,
    listMyProfilePhotos: listMyProfilePhotosMock,
  };
});

import { ProfilePhotoSection } from '@/components/profile-photo-section';

describe('ProfilePhotoSection (requiredForMatching)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    listMyProfilePhotosMock.mockResolvedValue([]);
  });

  it('shows required-for-matching hint when prop is set', async () => {
    render(<ProfilePhotoSection requiredForMatching />);

    await waitFor(() => {
      expect(
        screen.getByText(/At least one photo is required before you can see matches/),
      ).toBeTruthy();
    });
  });

  it('shows pending moderation badge', async () => {
    listMyProfilePhotosMock.mockResolvedValue([
      {
        id: 'photo_pending',
        profileId: 'prof_1',
        storageKey: 'k',
        originalFileName: 'a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1,
        position: 0,
        isPrimary: false,
        status: 'PENDING',
        moderationProvider: 'manual_queue',
        moderationResultJson: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<ProfilePhotoSection />);

    await waitFor(() => {
      expect(screen.getByText('Under review')).toBeTruthy();
    });
  });

  it('shows rejected badge and reason', async () => {
    listMyProfilePhotosMock.mockResolvedValue([
      {
        id: 'photo_rejected',
        profileId: 'prof_1',
        storageKey: 'k',
        originalFileName: 'a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1,
        position: 0,
        isPrimary: false,
        status: 'REJECTED',
        moderationProvider: 'manual',
        moderationResultJson: { decision: 'rejected' },
        rejectionReason: 'Not a clear face photo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<ProfilePhotoSection />);

    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeTruthy();
      expect(screen.getByText(/Reason: Not a clear face photo/)).toBeTruthy();
    });
  });
});
