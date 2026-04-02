/**
 * POST each handmade profile to POST /api/v1/profiles/evaluate (requires API + LLM up).
 *
 *   npx ts-node --transpile-only scripts/seed-handmade-profiles.ts
 *   npx ts-node --transpile-only scripts/seed-handmade-profiles.ts --limit=5
 *   npx ts-node --transpile-only scripts/seed-handmade-profiles.ts --offset=25 --limit=5
 *   npx ts-node --transpile-only scripts/seed-handmade-profiles.ts --baseUrl=http://localhost:3001 --delayMs=2500
 */

import { HANDMADE_PROFILES } from './handmade-profiles.data';

function parseArgs(): { limit?: number; offset: number; baseUrl: string; delayMs: number } {
  const args = process.argv.slice(2);
  const byKey = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg?.startsWith('--')) continue;
    const body = arg.slice(2);
    if (body.includes('=')) {
      const [k, ...rest] = body.split('=');
      byKey.set(k, rest.join('='));
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      byKey.set(body, next);
      i += 1;
    } else {
      byKey.set(body, 'true');
    }
  }
  const limitRaw = byKey.get('limit');
  const limit =
    limitRaw && Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : undefined;
  const offsetRaw = Number(byKey.get('offset') || '0');
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
  const baseUrl = (byKey.get('baseUrl') || 'http://localhost:3001').replace(/\/$/, '');
  const delayMsRaw = Number(byKey.get('delayMs') || '2000');
  const delayMs = Number.isFinite(delayMsRaw) ? Math.max(0, delayMsRaw) : 2000;
  return { limit, offset, baseUrl, delayMs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const { limit, offset, baseUrl, delayMs } = parseArgs();
  const end = limit !== undefined ? offset + limit : undefined;
  const rows = HANDMADE_PROFILES.slice(offset, end);

  console.log(
    `[seed-handmade] baseUrl=${baseUrl} offset=${offset} count=${rows.length} delayMs=${delayMs} (total defined=${HANDMADE_PROFILES.length})`,
  );

  const ok: string[] = [];
  const fail: { id: string; err: string }[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const p = rows[i];
    const url = `${baseUrl}/api/v1/profiles/evaluate`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: p.id,
          name: p.name,
          aboutMe: p.aboutMe,
          aboutPartner: p.aboutPartner,
          aboutRelationship: p.aboutRelationship,
        }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        const msg =
          typeof data?.message === 'string'
            ? data.message
            : `HTTP ${res.status}`;
        fail.push({ id: p.id, err: msg });
        console.error(`[seed-handmade] FAIL ${p.id} ${msg}`);
      } else {
        ok.push(p.id);
        const ev = data?.evaluation as Record<string, unknown> | undefined;
        const en = ev?.enrichment as { signals?: Record<string, unknown> } | undefined;
        const sig = en?.signals;
        console.log(
          `[seed-handmade] OK ${p.id} enrichment`,
          sig
            ? {
                dailyRhythm: sig.dailyRhythm,
                autonomy: sig.autonomyTogethernessDepth,
                kids: sig.kidsTimeline,
                conflict: sig.conflictStyleDetail,
                interests: sig.interestsTop3,
              }
            : '(none)',
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      fail.push({ id: p.id, err: msg });
      console.error(`[seed-handmade] FAIL ${p.id} ${msg}`);
    }
    if (i < rows.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  console.log('[seed-handmade] summary', { ok: ok.length, fail: fail.length, idsOk: ok });
  if (fail.length) console.log('[seed-handmade] failures', fail);

  console.log('\n[seed-handmade] Open UI:');
  console.log(`  Single:  http://localhost:3000/profiles?profileId=${rows[0]?.id}&enrichmentDebug=1`);
  console.log(
    `  Compare: http://localhost:3000/profiles/compare?ids=${rows
      .slice(0, 4)
      .map((r) => r.id)
      .join(',')}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
