import { Injectable } from '@nestjs/common';
import type {
  BuildPhotoStorageKeyInput,
  PhotoStorage,
} from './photo-storage.types';

@Injectable()
export class S3PhotoStorage implements PhotoStorage {
  readonly driver = 's3' as const;

  buildStorageKey(_input: BuildPhotoStorageKeyInput): string {
    throw new Error(
      'S3PhotoStorage is not implemented yet. Set PHOTO_STORAGE_DRIVER=local.',
    );
  }

  async save(_storageKey: string, _content: Buffer): Promise<void> {
    throw new Error(
      'S3PhotoStorage is not implemented yet. Set PHOTO_STORAGE_DRIVER=local.',
    );
  }

  async delete(_storageKey: string): Promise<void> {
    throw new Error(
      'S3PhotoStorage is not implemented yet. Set PHOTO_STORAGE_DRIVER=local.',
    );
  }

  async read(_storageKey: string): Promise<Buffer | null> {
    throw new Error(
      'S3PhotoStorage is not implemented yet. Set PHOTO_STORAGE_DRIVER=local.',
    );
  }
}
