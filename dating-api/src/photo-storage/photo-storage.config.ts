export type PhotoStorageDriver = 'local' | 's3';
/**
 * - `rekognition` — real AWS NSFW scan (admin only sees mid-band flags)
 * - `mock` — local sprint default without AWS: auto-approve (safe path)
 * - `stub` — legacy: leave PENDING for full manual queue
 */
export type PhotoModerationDriver = 'stub' | 'rekognition' | 'mock';

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

function hasAwsCredentials(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    trimOrUndefined(env.AWS_ACCESS_KEY_ID) ||
      trimOrUndefined(env.AWS_PROFILE) ||
      trimOrUndefined(env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI),
  );
}

/**
 * Sprint 19 default: AI path on.
 * Explicit `stub` keeps full manual queue. Unset → rekognition if AWS present, else mock.
 */
export function parseModerationDriver(
  raw: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): PhotoModerationDriver {
  const t = trimOrUndefined(raw)?.toLowerCase();
  if (t === 'stub') return 'stub';
  if (t === 'mock') return 'mock';
  if (t === 'rekognition') return 'rekognition';
  if (t) return 'stub'; // unknown explicit value → safe manual
  return hasAwsCredentials(env) ? 'rekognition' : 'mock';
}

export function loadPhotoStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): PhotoStorageConfig {
  return {
    storageDriver: parseStorageDriver(env.PHOTO_STORAGE_DRIVER),
    uploadDir: trimOrUndefined(env.PHOTO_UPLOAD_DIR) ?? DEFAULT_UPLOAD_DIR,
    moderationDriver: parseModerationDriver(env.PHOTO_MODERATION_DRIVER, env),
    faceDetectionEnabled: parseBool(env.PHOTO_FACE_DETECTION_ENABLED, false),
  };
}
