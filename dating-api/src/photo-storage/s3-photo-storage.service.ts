import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { extname, posix } from 'node:path';
import { Readable } from 'node:stream';
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

function loadS3Config(): {
  bucket: string;
  region: string;
  prefix: string;
  client: S3Client;
} {
  const bucket = process.env.PHOTO_S3_BUCKET?.trim();
  if (!bucket) {
    throw new Error('PHOTO_S3_BUCKET is required when PHOTO_STORAGE_DRIVER=s3');
  }
  const region = process.env.PHOTO_S3_REGION?.trim() || 'us-east-1';
  const prefix = (process.env.PHOTO_S3_PREFIX?.trim() || 'profile-photos').replace(
    /^\/+|\/+$/g,
    '',
  );
  const client = new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
  return { bucket, region, prefix, client };
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === 'function') {
    const bytes = await (
      body as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    return Buffer.from(bytes);
  }
  const readable = body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

@Injectable()
export class S3PhotoStorage implements PhotoStorage {
  readonly driver = 's3' as const;
  private readonly logger = new Logger(S3PhotoStorage.name);
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly client: S3Client;

  constructor() {
    const cfg = loadS3Config();
    this.bucket = cfg.bucket;
    this.prefix = cfg.prefix;
    this.client = cfg.client;
    this.logger.log(`S3PhotoStorage ready bucket=${this.bucket} prefix=${this.prefix}`);
  }

  buildStorageKey(input: BuildPhotoStorageKeyInput): string {
    const profileId = sanitizeSegment(input.profileId);
    const photoId = sanitizeSegment(input.photoId);
    const ext = extensionFromInput(input);
    return posix.join(this.prefix, profileId, `${photoId}${ext}`);
  }

  async save(storageKey: string, content: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: content,
      }),
    );
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
  }

  async read(storageKey: string): Promise<Buffer | null> {
    try {
      const out = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );
      return await streamToBuffer(out.Body);
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NoSuchKey' || name === 'NotFound') return null;
      throw err;
    }
  }
}
