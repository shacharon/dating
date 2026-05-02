import { LocalPhotoStorage } from './local-photo-storage.service';

describe('LocalPhotoStorage', () => {
  it('builds storage key as uploadDir/profileId/photoId.ext', () => {
    const storage = new LocalPhotoStorage({ uploadDir: 'uploads/profile-photos' });
    const key = storage.buildStorageKey({
      profileId: 'prof_123',
      photoId: 'photo_456',
      mimeType: 'image/jpeg',
    });
    expect(key).toBe('uploads/profile-photos/prof_123/photo_456.jpg');
  });

  it('prefers extension from original filename when present', () => {
    const storage = new LocalPhotoStorage({ uploadDir: 'uploads/profile-photos' });
    const key = storage.buildStorageKey({
      profileId: 'prof_abc',
      photoId: 'photo_xyz',
      mimeType: 'image/jpeg',
      originalFileName: 'my.image.PNG',
    });
    expect(key).toBe('uploads/profile-photos/prof_abc/photo_xyz.png');
  });

  it('falls back to .bin for unknown mime types', () => {
    const storage = new LocalPhotoStorage({ uploadDir: 'uploads/profile-photos' });
    const key = storage.buildStorageKey({
      profileId: 'prof_1',
      photoId: 'photo_1',
      mimeType: 'application/octet-stream',
    });
    expect(key).toBe('uploads/profile-photos/prof_1/photo_1.bin');
  });
});
