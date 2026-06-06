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
});
