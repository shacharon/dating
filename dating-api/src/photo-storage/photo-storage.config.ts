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

/** True when AWS SDK can resolve credentials (keys, profile, or container role). */
export function hasAwsCredentials(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    trimOrUndefined(env.AWS_ACCESS_KEY_ID) ||
      trimOrUndefined(env.AWS_PROFILE) ||
      trimOrUndefined(env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) ||
      trimOrUndefined(env.AWS_WEB_IDENTITY_TOKEN_FILE),
  );
}

/**
 * Fail-fast photo/moderation config for `NODE_ENV=production`.
 * Call only when production; throws Error with config names (no secrets).
 */
export function assertProductionPhotoConfig(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const storageDriver = parseStorageDriver(env.PHOTO_STORAGE_DRIVER);
  if (storageDriver !== 's3') {
    throw new Error(
      'PHOTO_STORAGE_DRIVER must be "s3" in production. ' +
        'Local storage is ephemeral and will cause data loss on pod restart/scale.',
    );
  }

  if (!trimOrUndefined(env.PHOTO_S3_BUCKET)) {
    throw new Error('PHOTO_S3_BUCKET is required when PHOTO_STORAGE_DRIVER=s3');
  }
  if (!trimOrUndefined(env.PHOTO_S3_REGION)) {
    throw new Error('PHOTO_S3_REGION is required when PHOTO_STORAGE_DRIVER=s3');
  }

  if (parseBool(env.PHOTO_MODERATION_AUTO_APPROVE, false)) {
    throw new Error(
      'PHOTO_MODERATION_AUTO_APPROVE cannot be enabled in production. ' +
        'This would allow NSFW/inappropriate content to bypass moderation.',
    );
  }

  const moderationDriver = parseModerationDriver(
    env.PHOTO_MODERATION_DRIVER,
    env,
  );
  if (moderationDriver === 'mock' || moderationDriver === 'stub') {
    throw new Error(
      `PHOTO_MODERATION_DRIVER="${moderationDriver}" is not allowed in production. ` +
        'Use "rekognition".',
    );
  }
  if (moderationDriver !== 'rekognition') {
    throw new Error(
      'PHOTO_MODERATION_DRIVER must be "rekognition" in production',
    );
  }

  if (!hasAwsCredentials(env)) {
    throw new Error(
      'AWS credentials are required for Rekognition in production ' +
        '(AWS_ACCESS_KEY_ID, AWS_PROFILE, or container credentials).',
    );
  }
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
