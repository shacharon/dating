import { ProductionValidationService } from './production-validation.service';

describe('ProductionValidationService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const validProdPhotoEnv = {
    NODE_ENV: 'production',
    PHOTO_STORAGE_DRIVER: 's3',
    PHOTO_S3_BUCKET: 'prod-bucket',
    PHOTO_S3_REGION: 'us-east-1',
    PHOTO_MODERATION_DRIVER: 'rekognition',
    AWS_ACCESS_KEY_ID: 'AKIATEST',
    REDIS_URL: 'redis://127.0.0.1:6379',
  };

  it('skips validation when not production', () => {
    process.env = { NODE_ENV: 'development', PHOTO_STORAGE_DRIVER: 'local' };
    const service = new ProductionValidationService();

    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('passes when production env is fully configured', () => {
    process.env = { ...validProdPhotoEnv };
    const service = new ProductionValidationService();

    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('throws when production uses local photo storage', () => {
    process.env = {
      ...validProdPhotoEnv,
      PHOTO_STORAGE_DRIVER: 'local',
    };
    const service = new ProductionValidationService();

    expect(() => service.onModuleInit()).toThrow(/PHOTO_STORAGE_DRIVER must be "s3"/);
  });

  it('throws when production has mock moderation', () => {
    process.env = {
      ...validProdPhotoEnv,
      PHOTO_MODERATION_DRIVER: 'mock',
    };
    const service = new ProductionValidationService();

    expect(() => service.onModuleInit()).toThrow(/PHOTO_MODERATION_DRIVER="mock"/);
  });

  it('throws when REDIS_URL is missing in production', () => {
    process.env = { ...validProdPhotoEnv };
    delete process.env.REDIS_URL;
    const service = new ProductionValidationService();

    expect(() => service.onModuleInit()).toThrow(/REDIS_URL is required in production/);
  });

  it('throws when REDIS_URL is whitespace-only in production', () => {
    process.env = { ...validProdPhotoEnv, REDIS_URL: '   ' };
    const service = new ProductionValidationService();

    expect(() => service.onModuleInit()).toThrow(/REDIS_URL is required in production/);
  });
});
