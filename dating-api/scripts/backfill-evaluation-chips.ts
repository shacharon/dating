/**
 * Backfill evaluation.chips for existing profiles by re-running /api/v1/profiles/evaluate.
 *
 * Defaults:
 * - force refresh all profiles (including existing non-empty chips)
 * - progress + final summary logs
 *
 * Optional safe skip:
 * --skip-non-empty=true  -> skip profiles whose evaluation.chips already has at least one chip
 */

type ProfileListItem = { id: string; name: string; savedAt: string };

type ProfilePayload = {
  id: string;
  name: string;
  texts: {
    aboutMe: string;
    aboutPartner: string;
    aboutRelationship: string;
  };
  evaluation?: {
    chips?: {
      self?: unknown[];
      partner?: unknown[];
      relationship?: unknown[];
    };
  };
};

function parseArgs(): {
  baseUrl: string;
  limit?: number;
  offset: number;
  sampleSize: number;
  skipNonEmpty: boolean;
  concurrency: number;
} {
  const args = process.argv.slice(2);
  const byKey = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg || !arg.startsWith('--')) continue;
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
  const baseUrl = byKey.get('base-url') || 'http://localhost:3001';
  const limitRaw = byKey.get('limit');
  const limit =
    limitRaw && Number.isFinite(Number(limitRaw)) ? Math.max(1, Number(limitRaw)) : undefined;
  const offsetRaw = Number(byKey.get('offset') || '0');
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  const sampleSizeRaw = Number(byKey.get('sample-size') || '12');
  const sampleSize = Number.isFinite(sampleSizeRaw)
    ? Math.max(10, Math.min(15, sampleSizeRaw))
    : 12;
  const skipNonEmpty =
    (byKey.get('skip-non-empty') || 'false').toLowerCase() === 'true';
  const concurrencyRaw = Number(byKey.get('concurrency') || '4');
  const concurrency = Number.isFinite(concurrencyRaw)
    ? Math.max(1, Math.min(12, Math.floor(concurrencyRaw)))
    : 4;
  return { baseUrl, limit, offset, sampleSize, skipNonEmpty, concurrency };
}

function chipsCount(profile: ProfilePayload): { self: number; partner: number; relationship: number } {
  const chips = profile.evaluation?.chips;
  return {
    self: Array.isArray(chips?.self) ? chips!.self!.length : 0,
    partner: Array.isArray(chips?.partner) ? chips!.partner!.length : 0,
    relationship: Array.isArray(chips?.relationship) ? chips!.relationship!.length : 0,
  };
}

function chipsTotal(profile: ProfilePayload): number {
  const c = chipsCount(profile);
  return c.self + c.partner + c.relationship;
}

function textLength(profile: ProfilePayload): number {
  const aboutMe = profile.texts.aboutMe?.trim() ?? '';
  const aboutPartner = profile.texts.aboutPartner?.trim() ?? '';
  const aboutRelationship = profile.texts.aboutRelationship?.trim() ?? '';
  return aboutMe.length + aboutPartner.length + aboutRelationship.length;
}

function isRealProfile(item: ProfileListItem): boolean {
  const s = `${item.id} ${item.name}`.toLowerCase();
  const banned = ['test', 'verify', 'debug', 'canonical', 'clarity'];
  return !banned.some((token) => s.includes(token));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${url}: ${typeof data?.message === 'string' ? data.message : 'request failed'}`,
    );
  }
  return data as T;
}

async function main(): Promise<void> {
  const { baseUrl, limit, offset, sampleSize, skipNonEmpty, concurrency } = parseArgs();
  const listUrl = `${baseUrl}/api/v1/profiles`;
  const listData = await fetchJson<{ ok: true; items: ProfileListItem[] }>(listUrl);
  const allItems = listData.items ?? [];
  const realOnly = allItems.filter(isRealProfile);
  const windowed = (limit ? realOnly.slice(offset, offset + limit) : realOnly.slice(offset)).filter(Boolean);
  const batchCandidates = windowed.length;

  console.log(
    `[chips-backfill] batch-start candidates=${batchCandidates} offset=${offset} limit=${limit ?? 'ALL'} skipNonEmpty=${skipNonEmpty} realOnly=true minTextLength=30 concurrency=${concurrency}`,
  );

  let processed = 0; // passed filters + attempted evaluate
  let refreshed = 0;
  let skippedNonEmpty = 0;
  let skippedNoText = 0;
  let failed = 0;
  const progressEvery = 50;

  let visitedCandidates = 0;
  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= windowed.length) return;
      const item = windowed[i];
      const getUrl = `${baseUrl}/api/v1/profiles/${encodeURIComponent(item.id)}`;
      try {
        const getData = await fetchJson<{ ok: true; profile: ProfilePayload }>(getUrl);
        const profile = getData.profile;
        const totalTextLength = textLength(profile);
        if (totalTextLength < 30) {
          skippedNoText += 1;
        } else {
          processed += 1;
          const beforeTotal = chipsTotal(profile);
          if (skipNonEmpty && beforeTotal > 0) {
            skippedNonEmpty += 1;
          } else {
            await fetchJson<{ ok: true; profileId: string }>(`${baseUrl}/api/v1/profiles/evaluate`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                id: profile.id,
                name: profile.name,
                aboutMe: profile.texts.aboutMe,
                aboutPartner: profile.texts.aboutPartner,
                aboutRelationship: profile.texts.aboutRelationship,
              }),
            });
            refreshed += 1;
          }
        }
      } catch (err) {
        failed += 1;
        const reason = err instanceof Error ? err.message : String(err);
        console.log(`[chips-backfill] fail id=${item.id} reason=${reason}`);
      }
      visitedCandidates += 1;
      if (
        visitedCandidates % progressEvery === 0 ||
        visitedCandidates === batchCandidates
      ) {
        console.log(
          `[chips-backfill] batch-progress candidates=${visitedCandidates}/${batchCandidates} processed=${processed} refreshed=${refreshed} skippedNonEmpty=${skippedNonEmpty} skippedNoText=${skippedNoText} failed=${failed}`,
        );
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log(
    `[chips-backfill] batch-summary candidates=${batchCandidates} processed=${processed} refreshed=${refreshed} skippedNonEmpty=${skippedNonEmpty} skippedNoText=${skippedNoText} failed=${failed}`,
  );

  // Post-run ranking sample: top N profiles by total chips (desc)
  const candidatesForSample: ProfileListItem[] = [];
  for (const item of windowed) {
    const getData = await fetchJson<{ ok: true; profile: ProfilePayload }>(
      `${baseUrl}/api/v1/profiles/${encodeURIComponent(item.id)}`,
    );
    if (textLength(getData.profile) >= 30) {
      candidatesForSample.push(item);
    }
  }
  const sampleRows: Array<{
    id: string;
    textLength: number;
    chips: { self: number; partner: number; relationship: number };
    total: number;
  }> = [];

  for (const item of candidatesForSample) {
    const getData = await fetchJson<{ ok: true; profile: ProfilePayload }>(
      `${baseUrl}/api/v1/profiles/${encodeURIComponent(item.id)}`,
    );
    const c = chipsCount(getData.profile);
    const totalTextLength = textLength(getData.profile);
    sampleRows.push({
      id: item.id,
      textLength: totalTextLength,
      chips: c,
      total: c.self + c.partner + c.relationship,
    });
  }
  sampleRows.sort((a, b) => b.total - a.total);
  const topRows = sampleRows.slice(0, sampleSize);

  const withAny = topRows.filter((r) => r.total > 0).length;
  const feelUsable = topRows.length > 0 && withAny / topRows.length >= 0.7;

  console.log('[chips-backfill] batch-top15-by-chips');
  for (const row of topRows) {
    console.log(
      `  - id=${row.id} textLength=${row.textLength} chips(self=${row.chips.self},partner=${row.chips.partner},relationship=${row.chips.relationship}) total=${row.total}`,
    );
  }
  console.log(
    `[chips-backfill] batch-feel-test profilesWithAnyChips=${withAny}/${topRows.length} usable=${feelUsable}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

