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
import { REKOGNITION, type RekognitionPort } from './photo-moderation.ports';
import { PrismaModule } from '../prisma/prisma.module';
import { PROFILE_PHOTO_REPOSITORY } from '../me-profile/repositories/profile-photo.repository';
import { PrismaProfilePhotoRepository } from '../me-profile/repositories/prisma-profile-photo.repository';

export const PHOTO_STORAGE_CONFIG = Symbol('PHOTO_STORAGE_CONFIG');
export const PHOTO_STORAGE = Symbol('PHOTO_STORAGE');

@Global()
@Module({
  imports: [PrismaModule],
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
    {
      provide: PROFILE_PHOTO_REPOSITORY,
      useClass: PrismaProfilePhotoRepository,
    },
  ],
  exports: [
    PHOTO_STORAGE_CONFIG,
    PHOTO_STORAGE,
    REKOGNITION,
    PROFILE_PHOTO_REPOSITORY,
  ],
})
export class PhotoStorageModule {}
