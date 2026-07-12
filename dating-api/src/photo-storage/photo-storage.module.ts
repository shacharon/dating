import { Global, Module } from '@nestjs/common';
import {
  loadPhotoStorageConfig,
  type PhotoStorageConfig,
} from './photo-storage.config';
import { LocalPhotoStorage } from './local-photo-storage.service';
import { S3PhotoStorage } from './s3-photo-storage.service';
import type { PhotoStorage } from './photo-storage.types';

export const PHOTO_STORAGE_CONFIG = Symbol('PHOTO_STORAGE_CONFIG');
export const PHOTO_STORAGE = Symbol('PHOTO_STORAGE');

@Global()
@Module({
  providers: [
    {
      provide: PHOTO_STORAGE_CONFIG,
      useFactory: (): PhotoStorageConfig => loadPhotoStorageConfig(),
    },
    {
      provide: PHOTO_STORAGE,
      inject: [PHOTO_STORAGE_CONFIG],
      useFactory: (cfg: PhotoStorageConfig): PhotoStorage => {
        return cfg.storageDriver === 's3'
          ? new S3PhotoStorage()
          : new LocalPhotoStorage(cfg);
      },
    },
  ],
  exports: [PHOTO_STORAGE_CONFIG, PHOTO_STORAGE],
})
export class PhotoStorageModule {}
