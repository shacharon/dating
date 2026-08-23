import {
  assertProductionPhotoConfig,
  hasAwsCredentials,
  loadPhotoStorageConfig,
  parseModerationDriver,
} from './photo-storage.config';

const validProdEnv: NodeJS.ProcessEnv = {
  PHOTO_STORAGE_DRIVER: 's3',
  PHOTO_S3_BUCKET: 'prod-bucket',
  PHOTO_S3_REGION: 'us-east-1',
  PHOTO_MODERATION_DRIVER: 'rekognition',
  AWS_ACCESS_KEY_ID: 'AKIATEST',
};

describe('assertProductionPhotoConfig', () => {
  it('passes for valid S3 + rekognition + AWS credentials', () => {
    expect(() => assertProductionPhotoConfig(validProdEnv)).not.toThrow();
  });

  it('accepts AWS_PROFILE as credentials', () => {
    expect(() =>
      assertProductionPhotoConfig({
        ...validProdEnv,
        AWS_ACCESS_KEY_ID: undefined,
        AWS_PROFILE: 'default',
      }),
    ).not.toThrow();
  });

  it('accepts container credentials URI', () => {
    expect(() =>
      assertProductionPhotoConfig({
        ...validProdEnv,
        AWS_ACCESS_KEY_ID: undefined,
        AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: '/v2/credentials/abc',
      }),
    ).not.toThrow();
  });

  it('rejects local storage driver', () => {
    expect(() =>
      assertProductionPhotoConfig({ ...validProdEnv, PHOTO_STORAGE_DRIVER: 'local' }),
    ).toThrow(/PHOTO_STORAGE_DRIVER must be "s3"/);
  });

  it('rejects missing S3 bucket or region', () => {
    expect(() =>
      assertProductionPhotoConfig({ ...validProdEnv, PHOTO_S3_BUCKET: '' }),
    ).toThrow(/PHOTO_S3_BUCKET/);
    expect(() =>
      assertProductionPhotoConfig({ ...validProdEnv, PHOTO_S3_REGION: '  ' }),
    ).toThrow(/PHOTO_S3_REGION/);
  });

  it('rejects auto-approve, mock, and stub moderation', () => {
    expect(() =>
      assertProductionPhotoConfig({
        ...validProdEnv,
        PHOTO_MODERATION_AUTO_APPROVE: '1',
      }),
    ).toThrow(/PHOTO_MODERATION_AUTO_APPROVE/);

    expect(() =>
      assertProductionPhotoConfig({
        ...validProdEnv,
        PHOTO_MODERATION_DRIVER: 'mock',
      }),
    ).toThrow(/PHOTO_MODERATION_DRIVER="mock"/);

    expect(() =>
      assertProductionPhotoConfig({
        ...validProdEnv,
        PHOTO_MODERATION_DRIVER: 'stub',
      }),
    ).toThrow(/PHOTO_MODERATION_DRIVER="stub"/);
  });

  it('rejects rekognition without AWS credentials', () => {
    expect(() =>
      assertProductionPhotoConfig({
        PHOTO_STORAGE_DRIVER: 's3',
        PHOTO_S3_BUCKET: 'b',
        PHOTO_S3_REGION: 'us-east-1',
        PHOTO_MODERATION_DRIVER: 'rekognition',
      }),
    ).toThrow(/AWS credentials are required/);
  });
});

describe('hasAwsCredentials', () => {
  it('detects key, profile, or container URI', () => {
    expect(hasAwsCredentials({ AWS_ACCESS_KEY_ID: 'x' })).toBe(true);
    expect(hasAwsCredentials({ AWS_PROFILE: 'default' })).toBe(true);
    expect(
      hasAwsCredentials({
        AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: '/v2/credentials/x',
      }),
    ).toBe(true);
    expect(hasAwsCredentials({})).toBe(false);
  });
});

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
