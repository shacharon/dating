/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const { listPendingPhotos, moderatePhoto, fetchAdminPhotoBlob } = vi.hoisted(
  () => ({
    listPendingPhotos: vi.fn(),
    moderatePhoto: vi.fn(),
    fetchAdminPhotoBlob: vi.fn(),
  }),
);

vi.mock('@/lib/admin-photos-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/admin-photos-api')>();
  return {
    ...actual,
    listPendingPhotos,
    moderatePhoto,
    fetchAdminPhotoBlob,
  };
});

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

import AdminPhotosPage from './photos-page-client';

describe('AdminPhotosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAdminPhotoBlob.mockRejectedValue(new Error('no blob'));
    listPendingPhotos.mockResolvedValue({
      items: [
        {
          id: 'photo_1',
          profileId: 'prof_1',
          userId: 'user_1',
          createdAt: '2026-07-01T00:00:00.000Z',
          mimeType: 'image/jpeg',
          originalFileName: 'face.jpg',
          fileUrl: '/api/v1/admin/photos/photo_1/file',
          status: 'FLAGGED_FOR_REVIEW',
          mlConfidence: 55,
          mlLabels: ['Suggestive'],
          moderationProvider: 'rekognition',
        },
      ],
      nextCursor: null,
    });
    moderatePhoto.mockResolvedValue({
      id: 'photo_1',
      profileId: 'prof_1',
      status: 'APPROVED',
      rejectionReason: null,
      isPrimary: true,
      updatedAt: '2026-07-01T01:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows ML confidence and approve/reject/skip actions', async () => {
    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText(/ML confidence 55/i)).toBeTruthy();
    });
    expect(screen.getByText(/Suggestive/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Approve/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Skip/i })).toBeTruthy();
  });

  it('approves photo via API', async () => {
    listPendingPhotos
      .mockResolvedValueOnce({
        items: [
          {
            id: 'photo_1',
            profileId: 'prof_1',
            userId: 'user_1',
            createdAt: '2026-07-01T00:00:00.000Z',
            mimeType: 'image/jpeg',
            originalFileName: 'face.jpg',
            fileUrl: '/api/v1/admin/photos/photo_1/file',
            status: 'PENDING',
            mlConfidence: null,
            mlLabels: [],
            moderationProvider: 'manual_queue',
          },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({ items: [], nextCursor: null });

    render(<AdminPhotosPage />);
    await waitFor(() => screen.getByRole('button', { name: /Approve/i }));
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));
    await waitFor(() => {
      expect(moderatePhoto).toHaveBeenCalledWith('photo_1', 'approve');
    });
  });
});
