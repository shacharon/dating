/**
 * Narrow post-fix verification: self.relationshipClarity only.
 * Reads server log delta for raw_llm_output + validateExtraction stages.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const LOG_PATH = join(process.cwd(), 'logs', 'dating.log');

/** Profiles with strong self-domain relationship-structure language (aboutMe) or high-confidence clarity cues. */
const PROFILE_IDS: string[] = [
  'clarity-e2e-001',
  'clarity-debug-001',
  'clarity-debug-002',
  'clarity-debug-003',
  'val-test-neg-001',
  'val-test-003',
  'val-test-001',
  'val-test-002',
  '10',
  '21',
];

function readRecentLog(maxBytes = 4_000_000): string {
  if (!existsSync(LOG_PATH)) return '';
  const size = statSync(LOG_PATH).size;
  const text = readFileSync(LOG_PATH, 'utf8');
  if (size <= maxBytes) return text;
  return text.slice(text.length - maxBytes);
}

/** Last [AnalyzeV2] start..done slice for this profileId (exact id match). */
function extractLastAnalyzeBlock(log: string, profileId: string): string {
  const lines = log.split(/\r?\n/);
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\[AnalyzeV2\] start id=(.+)$/);
    if (m && m[1] === profileId) startIdx = i;
  }
  if (startIdx < 0) return '';
  const out: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    out.push(lines[i]);
    const dm = lines[i].match(/\[AnalyzeV2\] done id=(.+)$/);
    if (dm && dm[1] === profileId) break;
  }
  return out.join('\n');
}

function parseTraceStages(chunk: string): {
  raw: number | null;
  afterValidate: number | null;
  sawRaw: boolean;
  sawValidate: boolean;
} {
  let raw: number | null = null;
  let afterValidate: number | null = null;
  let sawRaw = false;
  let sawValidate = false;
  for (const line of chunk.split('\n')) {
    if (!line.includes('self_relationship_clarity_trace')) continue;
    const idx = line.indexOf('DEBUG:');
    if (idx < 0) continue;
    const jsonPart = line.slice(idx + 'DEBUG:'.length).trim();
    try {
      const o = JSON.parse(jsonPart) as {
        event?: string;
        stage?: string;
        value?: unknown;
      };
      if (o.event !== 'self_relationship_clarity_trace') continue;
      let parsed: number | null = null;
      if (o.value === null || o.value === undefined) parsed = null;
      else if (typeof o.value === 'number' && !Number.isNaN(o.value)) parsed = Math.round(o.value);
      else parsed = null;
      if (o.stage === 'raw_llm_output') {
        raw = parsed;
        sawRaw = true;
      }
      if (o.stage === 'validateExtraction') {
        afterValidate = parsed;
        sawValidate = true;
      }
    } catch {
      continue;
    }
  }
  return { raw, afterValidate, sawRaw, sawValidate };
}

function isRateLimited(status: number, body: string, logChunk: string): boolean {
  if (status === 429) return true;
  if (status !== 500) return false;
  const t = `${body}\n${logChunk}`;
  return /429\s+Rate limit|rate limit reached|RPD\): Limit/i.test(t);
}

async function runOne(profileId: string): Promise<{
  profileId: string;
  raw: string;
  afterValidate: string;
  canonical: string;
  persisted: string;
  result: 'PASS' | 'FAIL' | 'RATE_LIMITED';
}> {
  let status = 0;
  let body = '';
  try {
    const res = await fetch(
      `${API_BASE}/api/profiles/${encodeURIComponent(profileId)}/analyze-v2?force=1`,
      { method: 'POST' },
    );
    status = res.status;
    body = await res.text();
  } catch (e) {
    body = e instanceof Error ? e.message : String(e);
  }

  await new Promise((r) => setTimeout(r, 800));
  const logTail = readRecentLog();
  const analyzeBlock = extractLastAnalyzeBlock(logTail, profileId);
  const { raw, afterValidate: afterV, sawValidate } = parseTraceStages(analyzeBlock);

  let canonical: number | null = null;
  if (status === 201) {
    try {
      const j = JSON.parse(body) as { extraction?: { base?: { self?: { signals?: Record<string, unknown> } } } };
      const v = j?.extraction?.base?.self?.signals?.relationshipClarity;
      if (typeof v === 'number' && !Number.isNaN(v)) canonical = Math.round(v);
      else canonical = null;
    } catch {
      canonical = null;
    }
  }

  const row = await prisma.profileExtractionV2.findUnique({
    where: { profileId },
    select: { relationship_clarity_self: true },
  });
  const persisted = row?.relationship_clarity_self ?? null;

  const rate = isRateLimited(status, body, analyzeBlock);

  let result: 'PASS' | 'FAIL' | 'RATE_LIMITED' = 'FAIL';
  if (rate) {
    result = 'RATE_LIMITED';
  } else if (status === 201) {
    const canonOk = canonical === persisted;
    const traceOk = !sawValidate || afterV === canonical;
    result = canonOk && traceOk ? 'PASS' : 'FAIL';
  } else {
    result = 'FAIL';
  }

  return {
    profileId,
    raw: raw === null ? 'null' : String(raw),
    afterValidate: afterV === null ? 'null' : String(afterV),
    canonical: canonical === null ? 'null' : String(canonical),
    persisted: persisted === null ? 'null' : String(persisted),
    result,
  };
}

async function main(): Promise<void> {
  console.log(
    'profileId\traw_self_RC\tafter_validateExtraction\tcanonical_relationship_clarity_self\tpersisted_DB\tresult',
  );
  const rows: Awaited<ReturnType<typeof runOne>>[] = [];
  for (const id of PROFILE_IDS) {
    const row = await runOne(id);
    rows.push(row);
    console.log(
      `${row.profileId}\t${row.raw}\t${row.afterValidate}\t${row.canonical}\t${row.persisted}\t${row.result}`,
    );
    await new Promise((r) => setTimeout(r, 2500));
  }

  const pass = rows.filter((r) => r.result === 'PASS').length;
  const fail = rows.filter((r) => r.result === 'FAIL').length;
  const rl = rows.filter((r) => r.result === 'RATE_LIMITED').length;
  const non429Pass = rows.filter((r) => r.result !== 'RATE_LIMITED' && r.result === 'PASS').length;
  const non429Fail = rows.filter((r) => r.result !== 'RATE_LIMITED' && r.result === 'FAIL').length;

  console.log('');
  console.log('--- summary ---');
  console.log(`total tested: ${rows.length}`);
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  console.log(`RATE_LIMITED: ${rl}`);
  console.log(`non-429 PASS: ${non429Pass}`);
  console.log(`non-429 FAIL: ${non429Fail}`);

  if (non429Fail === 0 && non429Pass > 0) {
    console.log('');
    console.log('Engine fix VERIFIED for all non-429 runs. Issue CLOSED.');
  } else if (non429Fail > 0) {
    console.log('');
    console.log('Non-429 failures present — do not close until investigated.');
  } else {
    console.log('');
    console.log('Insufficient non-429 successful runs to verify (check RATE_LIMITED / API).');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
