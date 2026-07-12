/**
 * Block until dating-api responds on /health (or exit 1 on timeout).
 * Used before starting dating-ui so Next rewrites do not spam ECONNREFUSED.
 *
 * Env:
 *   API_WAIT_URL — default http://127.0.0.1:3001/health
 *   API_WAIT_TIMEOUT_MS — default 120000
 *   SKIP_API_WAIT=1 — skip (UI-only work)
 */

const url =
  process.env.API_WAIT_URL?.trim() ?? "http://127.0.0.1:3001/health";
const timeoutMs = Number(process.env.API_WAIT_TIMEOUT_MS ?? 120_000);
const intervalMs = 500;

if (process.env.SKIP_API_WAIT === "1") {
  console.log("[wait-for-api] SKIP_API_WAIT=1 — not waiting");
  process.exit(0);
}

async function probe() {
  const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
  return res.ok;
}

async function main() {
  const start = Date.now();
  process.stdout.write(`[wait-for-api] Waiting for ${url}\n`);

  while Date.now() - start < timeoutMs) {
    try {
      if (await probe()) {
        console.log("[wait-for-api] API is up");
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  console.error(
    `[wait-for-api] Timed out after ${timeoutMs}ms.\n` +
      "Start dating-api first:\n" +
      "  cd dating-api && npm run start:dev\n" +
      "Or from repo root:\n" +
      "  npm run dev\n" +
      `(expected ${url})`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("[wait-for-api] fatal:", err?.message ?? err);
  process.exit(1);
});
