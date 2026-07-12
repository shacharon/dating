import { loadPhotoStorageConfig } from './photo-storage.config';
import { LocalPhotoStorage } from './local-photo-storage.service';
import { S3PhotoStorage } from './s3-photo-storage.service';

describe('Photo storage driver selection', () => {
  it('defaults to local driver', () => {
    const cfg = loadPhotoStorageConfig({});
    const storage =
      cfg.storageDriver === 's3'
        ? new S3PhotoStorage()
        : new LocalPhotoStorage(cfg);
    expect(storage.driver).toBe('local');
  });

  it('selects s3 placeholder driver when configured', () => {
    const cfg = loadPhotoStorageConfig({ PHOTO_STORAGE_DRIVER: 's3' });
    const storage =
      cfg.storageDriver === 's3'
        ? new S3PhotoStorage()
        : new LocalPhotoStorage(cfg);
    expect(storage.driver).toBe('s3');
    expect(() =>
      storage.buildStorageKey({
        profileId: 'p1',
        photoId: 'ph1',
        mimeType: 'image/jpeg',
      }),
    ).toThrow('S3PhotoStorage is not implemented yet');
  });
});
