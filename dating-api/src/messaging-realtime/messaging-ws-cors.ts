/** Mirrors `main.ts` CORS allowlist for socket.io handshake. */

const DEFAULT_CORS_ORIGIN = 'http://localhost:3000,http://127.0.0.1:3000';

const LOCAL_DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:[1-9]\d{0,4})?$/i;

function allowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim() || DEFAULT_CORS_ORIGIN;
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export const messagingWsCors = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins().includes(origin)) {
      callback(null, true);
      return;
    }
    if (LOCAL_DEV_ORIGIN.test(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true as const,
};
