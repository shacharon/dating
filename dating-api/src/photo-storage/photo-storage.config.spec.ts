import { loadPhotoStorageConfig, parseModerationDriver } from './photo-storage.config';

describe('loadPhotoStorageConfig', () => {
  it('defaults to mock AI path when AWS credentials are missing', () => {
    const cfg = loadPhotoStorageConfig({});
    expect(cfg).toEqual({
      storageDriver: 'local',
      uploadDir: 'uploads/profile-photos',
      moderationDriver: 'mock',
      faceDetectionEnabled: false,
    });
  });

  it('defaults to rekognition when AWS credentials exist', () => {
    const cfg = loadPhotoStorageConfig({
      AWS_ACCESS_KEY_ID: 'AKIATEST',
    });
    expect(cfg.moderationDriver).toBe('rekognition');
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

  it('honors explicit stub / mock', () => {
    expect(parseModerationDriver('stub', {})).toBe('stub');
    expect(parseModerationDriver('mock', {})).toBe('mock');
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
