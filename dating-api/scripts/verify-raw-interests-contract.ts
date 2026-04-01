import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const LOG_PATH = join(process.cwd(), 'logs', 'dating.log');
const PROFILE_IDS = [
  'val-test-001',
  'val-test-003',
  'val-test-neg-001',
  'test-maya-001',
  'test-noa-003',
];

function getAnalyzeBlock(log: string, profileId: string): string {
  const lines = log.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`[AnalyzeV2] start id=${profileId}`)) start = i;
  }
  if (start < 0) return '';
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    out.push(lines[i]);
    if (lines[i].includes(`[AnalyzeV2] done id=${profileId}`)) break;
  }
  return out.join('\n');
}

function extractSelfRequestId(block: string): string | null {
  for (const line of block.split(/\r?\n/)) {
    if (line.includes('"event":"extraction_v2_base_before_llm"') && line.includes('"domain":"self"')) {
      const m = line.match(/"requestId":"([^"]+)"/);
      if (m) return m[1];
    }
  }
  return null;
}

function rawLlmHasRawInterests(block: string, selfRequestId: string | null): boolean {
  if (!selfRequestId) return false;
  for (const line of block.split(/\r?\n/)) {
    if (
      line.includes('"event":"OPENAI_RAW_SHAPE"') &&
      line.includes(`"requestId":"${selfRequestId}"`) &&
      line.includes('"purpose":"extraction-v2-base"')
    ) {
      return line.includes('rawInterests');
    }
  }
  return false;
}

async function main(): Promise<void> {
  console.log('profileId\traw LLM output has rawInterests?\tparsed rawInterests\tresult');

  for (const id of PROFILE_IDS) {
    const res = await fetch(
      `${API_BASE_URL}/api/profiles/${encodeURIComponent(id)}/analyze-v2?force=1`,
      { method: 'POST' },
    );
    const bodyText = await res.text();
    if (!res.ok) {
      console.log(`${id}\tno\t[]\tFAIL (${res.status})`);
      continue;
    }

    const body = JSON.parse(bodyText) as {
      extraction?: { base?: { self?: { rawInterests?: string[] } } };
    };
    const parsed = body.extraction?.base?.self?.rawInterests ?? [];

    const log = existsSync(LOG_PATH) ? readFileSync(LOG_PATH, 'utf8') : '';
    const block = getAnalyzeBlock(log, id);
    const selfRequestId = extractSelfRequestId(block);
    const hasRawInLlm = rawLlmHasRawInterests(block, selfRequestId);

    const pass = Array.isArray(parsed);
    console.log(
      `${id}\t${hasRawInLlm ? 'yes' : 'no'}\t${JSON.stringify(parsed)}\t${pass ? 'PASS' : 'FAIL'}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

