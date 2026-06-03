#!/usr/bin/env npx ts-node
/**
 * Preflight: GET /health/realtime on a running API instance.
 * Usage: SMOKE_BASE_URL=http://localhost:3001 npm run smoke:ws-preflight
 */
const base = (process.env.SMOKE_BASE_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const url = `${base}/health/realtime`;

async function main(): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error(`smoke:ws-preflight FAIL — could not reach ${url}`);
    console.error(err);
    process.exit(1);
  }

  if (!res.ok) {
    console.error(
      `smoke:ws-preflight FAIL — ${url} returned HTTP ${res.status}`,
    );
    process.exit(1);
  }

  const body = (await res.json()) as {
    ok?: boolean;
    messaging?: {
      namespace?: string;
      socketIoPath?: string;
      redisAdapter?: boolean;
      sessionCookieName?: string;
    };
  };

  const m = body.messaging;
  const errors: string[] = [];

  if (body.ok !== true) errors.push('ok !== true');
  if (m?.namespace !== '/ws/messaging') {
    errors.push(`namespace expected /ws/messaging, got ${m?.namespace}`);
  }
  if (m?.socketIoPath !== '/socket.io') {
    errors.push(`socketIoPath expected /socket.io, got ${m?.socketIoPath}`);
  }
  if (typeof m?.redisAdapter !== 'boolean') {
    errors.push('redisAdapter must be boolean');
  }
  if (!m?.sessionCookieName?.trim()) {
    errors.push('sessionCookieName missing');
  }

  if (errors.length > 0) {
    console.error('smoke:ws-preflight FAIL —', errors.join('; '));
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log('smoke:ws-preflight OK —', url);
  console.log(JSON.stringify(body, null, 2));
}

void main();
