/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';

const { listMyProfilePhotosMock, uploadMyProfilePhotoMock } = vi.hoisted(() => ({
  listMyProfilePhotosMock: vi.fn(),
  uploadMyProfilePhotoMock: vi.fn(),
}));

const { pickProfilePhotoFileMock } = vi.hoisted(() => ({
  pickProfilePhotoFileMock: vi.fn(),
}));

vi.mock('@/lib/api/me-photos-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/me-photos-api')>();
  return {
    ...actual,
    listMyProfilePhotos: listMyProfilePhotosMock,
    uploadMyProfilePhoto: uploadMyProfilePhotoMock,
  };
});

vi.mock('@/lib/matches/pick-profile-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/matches/pick-profile-photo')>();
  return {
    ...actual,
    pickProfilePhotoFile: pickProfilePhotoFileMock,
  };
});

import { ProfilePhotoSection } from '@/components/profile-photo-section';
import {
  ProfilePhotoPermissionDeniedError,
  ProfilePhotoPickCancelledError,
} from '@/lib/matches/pick-profile-photo';
import { setPlatformOverrideForTests } from '@/lib/platform/platform';

describe('ProfilePhotoSection (requiredForMatching)', () => {
  afterEach(() => {
    cleanup();
    setPlatformOverrideForTests(null);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    listMyProfilePhotosMock.mockResolvedValue([]);
    uploadMyProfilePhotoMock.mockResolvedValue(undefined);
    pickProfilePhotoFileMock.mockResolvedValue(null);
    setPlatformOverrideForTests(null);
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

  it('renders web file input on web (not native upload button)', async () => {
    render(<ProfilePhotoSection />);

    await waitFor(() => {
      expect(screen.getByText('Upload')).toBeTruthy();
    });

    expect(screen.queryByRole('button', { name: 'Upload' })).toBeNull();
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp');
  });

  it('uploads picked file on capacitor success', async () => {
    setPlatformOverrideForTests('capacitor');
    const file = new File(['x'], 'profile-photo.jpeg', { type: 'image/jpeg' });
    pickProfilePhotoFileMock.mockResolvedValue(file);
    const onMutated = vi.fn();
    const createObjectURLMock = vi.fn(() => 'blob:preview');
    const revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURLMock,
    });

    render(<ProfilePhotoSection onMutated={onMutated} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(uploadMyProfilePhotoMock).toHaveBeenCalledWith(file);
      expect(onMutated).toHaveBeenCalled();
    });
  });

  it('shows upload failed for unsupported format on capacitor', async () => {
    setPlatformOverrideForTests('capacitor');
    pickProfilePhotoFileMock.mockRejectedValue(
      new Error('Unsupported image format: heic'),
    );

    render(<ProfilePhotoSection />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeTruthy();
    });
  });

  it('shows camera permission denied on capacitor when pick fails', async () => {
    setPlatformOverrideForTests('capacitor');
    pickProfilePhotoFileMock.mockRejectedValue(
      new ProfilePhotoPermissionDeniedError(),
    );

    render(<ProfilePhotoSection />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Camera or photo library access is required to upload a photo/,
        ),
      ).toBeTruthy();
    });
  });

  it('swallows cancel on capacitor without showing error', async () => {
    setPlatformOverrideForTests('capacitor');
    pickProfilePhotoFileMock.mockRejectedValue(
      new ProfilePhotoPickCancelledError(),
    );

    render(<ProfilePhotoSection />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(pickProfilePhotoFileMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('ProfilePhotoSection upload security (static)', () => {
  it('uploads picked photos via authenticated me-photos-api helper only', () => {
    const src = fs.readFileSync(
      path.join(__dirname, 'profile-photo-section.tsx'),
      'utf8',
    );
    expect(src).toContain('uploadMyProfilePhoto');
    expect(src).not.toMatch(/fetch\([^)]*\/api\/v1\/me\/profile\/photos/);
  });

  it('maps unsupported picker formats to generic upload failure copy', () => {
    const src = fs.readFileSync(
      path.join(__dirname, 'profile-photo-section.tsx'),
      'utf8',
    );
    expect(src).toContain("Unsupported image format");
    expect(src).toContain('photosCopy.uploadFailed');
  });
});
