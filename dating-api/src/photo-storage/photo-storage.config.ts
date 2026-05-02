export type PhotoStorageDriver = 'local' | 's3';
export type PhotoModerationDriver = 'stub' | 'rekognition';

export interface PhotoStorageConfig {
  storageDriver: PhotoStorageDriver;
  uploadDir: string;
  moderationDriver: PhotoModerationDriver;
  faceDetectionEnabled: boolean;
}

const DEFAULT_UPLOAD_DIR = 'uploads/profile-photos';

function trimOrUndefined(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  return t ? t : undefined;
}

function parseBool(raw: string | undefined, fallback = false): boolean {
  const t = trimOrUndefined(raw);
  if (!t) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(t.toLowerCase());
}

function parseStorageDriver(raw: string | undefined): PhotoStorageDriver {
  const t = trimOrUndefined(raw)?.toLowerCase();
  return t === 's3' ? 's3' : 'local';
}

function parseModerationDriver(raw: string | undefined): PhotoModerationDriver {
  const t = trimOrUndefined(raw)?.toLowerCase();
  return t === 'rekognition' ? 'rekognition' : 'stub';
}

export function loadPhotoStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): PhotoStorageConfig {
  return {
    storageDriver: parseStorageDriver(env.PHOTO_STORAGE_DRIVER),
    uploadDir: trimOrUndefined(env.PHOTO_UPLOAD_DIR) ?? DEFAULT_UPLOAD_DIR,
    moderationDriver: parseModerationDriver(env.PHOTO_MODERATION_DRIVER),
    faceDetectionEnabled: parseBool(env.PHOTO_FACE_DETECTION_ENABLED, false),
  };
}
