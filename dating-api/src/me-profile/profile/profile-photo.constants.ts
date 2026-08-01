export const PHOTO_MAX_COUNT = 3;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export type UploadedPhotoFile = {
  mimetype: string;
  size: number;
  originalname?: string;
  buffer: Buffer;
};
