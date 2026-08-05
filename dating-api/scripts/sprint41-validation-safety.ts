/**
 * Shared local-only guards for Sprint 41 Story 3 seed/verify scripts.
 */
import { loadPhotoStorageConfig } from '../src/photo-storage/photo-storage.config';

export function assertSprint41ValidationSafeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to run: NODE_ENV=production');
  }

  const photoCfg = loadPhotoStorageConfig(env);
  if (photoCfg.storageDriver === 's3') {
    throw new Error(
      'Refusing to run: PHOTO_STORAGE_DRIVER=s3 (local photo storage required)',
    );
  }

  const dbUrl = env.DATABASE_URL ?? '';
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  let host = '';
  try {
    host = new URL(dbUrl).hostname.toLowerCase();
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }

  const localHosts = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    'host.docker.internal',
  ]);
  const prodLike =
    /amazonaws\.com$|\.rds\.|prod\.|production|aurora|neon\.tech|supabase\.co|railway\.app|render\.com/i.test(
      host,
    ) || host.endsWith('.aws');

  if (prodLike || !localHosts.has(host)) {
    throw new Error(
      `Refusing to run: DATABASE_URL host "${host}" is not a local allowlisted host ` +
        `(localhost / 127.0.0.1 / ::1 / host.docker.internal)`,
    );
  }
}
