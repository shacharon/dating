import { loadPhotoStorageConfig } from './photo-storage.config';

describe('loadPhotoStorageConfig', () => {
  it('uses safe defaults when env values are missing', () => {
    const cfg = loadPhotoStorageConfig({});
    expect(cfg).toEqual({
      storageDriver: 'local',
      uploadDir: 'uploads/profile-photos',
      moderationDriver: 'stub',
      faceDetectionEnabled: false,
    });
  });

  it('parses valid env values', () => {
    const cfg = loadPhotoStorageConfig({
      PHOTO_STORAGE_DRIVER: 's3',
      PHOTO_UPLOAD_DIR: 'uploads/custom-profile-photos',
      PHOTO_MODERATION_DRIVER: 'rekognition',
      PHOTO_FACE_DETECTION_ENABLED: 'true',
    });
    expect(cfg).toEqual({
      storageDriver: 's3',
      uploadDir: 'uploads/custom-profile-photos',
      moderationDriver: 'rekognition',
      faceDetectionEnabled: true,
    });
  });

  it('falls back for unknown values', () => {
    const cfg = loadPhotoStorageConfig({
      PHOTO_STORAGE_DRIVER: 'unknown',
      PHOTO_MODERATION_DRIVER: 'other',
      PHOTO_FACE_DETECTION_ENABLED: 'nope',
    });
    expect(cfg.storageDriver).toBe('local');
    expect(cfg.moderationDriver).toBe('stub');
    expect(cfg.faceDetectionEnabled).toBe(false);
  });
});
