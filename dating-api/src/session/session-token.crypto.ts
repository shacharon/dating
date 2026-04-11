import { createHash, randomBytes } from 'node:crypto';

/** Opaque bearer length (256 bits) before encoding. */
const SESSION_TOKEN_BYTES = 32;

/**
 * Generate a high-entropy opaque session token (URL-safe).
 * Never persist this value; hash with {@link hashSessionToken} for storage.
 */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

/**
 * Deterministic storage form: SHA-256 hex digest of `rawToken + pepper`.
 * Pepper must be configured server-side; never send to clients.
 */
export function hashSessionToken(rawToken: string, pepper: string): string {
  return createHash('sha256')
    .update(rawToken, 'utf8')
    .update(pepper, 'utf8')
    .digest('hex');
}
