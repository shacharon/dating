import { Injectable } from '@nestjs/common';
import { extname, posix } from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { PhotoStorageConfig } from './photo-storage.config';
import type {
  BuildPhotoStorageKeyInput,
  PhotoStorage,
} from './photo-storage.types';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

function sanitizeSegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Photo storage key segment cannot be empty.');
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function extensionFromInput(input: BuildPhotoStorageKeyInput): string {
  const fromName = extname(input.originalFileName ?? '').toLowerCase();
  if (fromName) return fromName;
  return MIME_EXTENSION_MAP[input.mimeType.toLowerCase()] ?? '.bin';
}

@Injectable()
export class LocalPhotoStorage implements PhotoStorage {
  readonly driver = 'local' as const;

  constructor(private readonly cfg: Pick<PhotoStorageConfig, 'uploadDir'>) {}

  buildStorageKey(input: BuildPhotoStorageKeyInput): string {
    const profileId = sanitizeSegment(input.profileId);
    const photoId = sanitizeSegment(input.photoId);
    const ext = extensionFromInput(input);
    return posix.join(
      this.cfg.uploadDir.replace(/\\/g, '/'),
      profileId,
      `${photoId}${ext}`,
    );
  }

  async save(storageKey: string, content: Buffer): Promise<void> {
    const fullPath = resolve(process.cwd(), storageKey);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = resolve(process.cwd(), storageKey);
    await rm(fullPath, { force: true });
  }

  async read(storageKey: string): Promise<Buffer | null> {
    const fullPath = resolve(process.cwd(), storageKey);
    try {
      return await readFile(fullPath);
    } catch {
      return null;
    }
  }
}
