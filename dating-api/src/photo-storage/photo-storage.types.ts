import type { PhotoStorageDriver } from './photo-storage.config';

export interface BuildPhotoStorageKeyInput {
  profileId: string;
  photoId: string;
  mimeType: string;
  originalFileName?: string | null;
}

export interface PhotoStorage {
  readonly driver: PhotoStorageDriver;
  buildStorageKey(input: BuildPhotoStorageKeyInput): string;
  save(storageKey: string, content: Buffer): Promise<void>;
  delete(storageKey: string): Promise<void>;
  read(storageKey: string): Promise<Buffer | null>;
}
