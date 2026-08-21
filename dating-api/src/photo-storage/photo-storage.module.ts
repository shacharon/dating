import { Global, Module } from '@nestjs/common';
import {
  DetectFacesCommand,
  DetectModerationLabelsCommand,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import {
  loadPhotoStorageConfig,
  type PhotoStorageConfig,
} from './photo-storage.config';
import { LocalPhotoStorage } from './local-photo-storage.service';
import { S3PhotoStorage } from './s3-photo-storage.service';
import type { PhotoStorage } from './photo-storage.types';
import { loadPhotoModerationThresholds } from './photo-moderation.config';
import {
  REKOGNITION,
  type RekognitionPort,
} from './photo-moderation.ports';

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
    {
      provide: REKOGNITION,
      useFactory: (): RekognitionPort => {
        const { awsRegion } = loadPhotoModerationThresholds();
        const client = new RekognitionClient({ region: awsRegion });
        return {
          detectModerationLabels: (input) =>
            client.send(new DetectModerationLabelsCommand(input)),
          detectFaces: (input) => client.send(new DetectFacesCommand(input)),
        };
      },
    },
  ],
  exports: [PHOTO_STORAGE_CONFIG, PHOTO_STORAGE, REKOGNITION],
})
export class PhotoStorageModule {}
