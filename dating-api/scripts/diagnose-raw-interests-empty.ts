import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const PROFILES_DIR = join(process.cwd(), 'data', 'profiles');
const LOG_PATH = join(process.cwd(), 'logs', 'dating.log');

const PROFILE_IDS = [
  'val-test-001',
  'val-test-003',
  'val-test-neg-001',
  'test-maya-001',
  'test-noa-003',
];

function expectedInterests(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  const map: Array<[RegExp, string]> = [
    [/\brun|running\b/, 'running'],
    [/\bgym\b/, 'gym'],
    [/\bcook|cooking\b/, 'cooking'],
    [/\bbooks?|read|reading|history\b/, 'reading'],
    [/\bgarden|gardening\b/, 'gardening'],
    [/\byoga\b/, 'yoga'],
    [/\bcoffee\b/, 'coffee'],
  ];
  for (const [re, tag] of map) {
    if (re.test(t) && !out.includes(tag)) out.push(tag);
  }
  return out;
}

function parseLastAnalyzeBlock(logText: string, profileId: string): string {
  const lines = logText.split(/\r?\n/);
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

function extractSelfRawModelPreview(analyzeBlock: string): string {
  const lines = analyzeBlock.split(/\r?\n/);
  let selfRequestId: string | null = null;
  for (const line of lines) {
    if (line.includes('"event":"extraction_v2_base_before_llm"') && line.includes('"domain":"self"')) {
      const m = line.match(/"requestId":"([^"]+)"/);
      if (m) {
        selfRequestId = m[1];
      }
    }
  }
  if (!selfRequestId) return '';

  for (const line of lines) {
    if (
      line.includes('"event":"OPENAI_RAW_SHAPE"') &&
      line.includes(`"requestId":"${selfRequestId}"`) &&
      line.includes('"purpose":"extraction-v2-base"')
    ) {
      const idx = line.indexOf('{');
      if (idx < 0) return '';
      try {
        const obj = JSON.parse(line.slice(idx)) as {
          shape?: { message0_content_preview?: string };
        };
        return obj.shape?.message0_content_preview ?? '';
      } catch {
        return '';
      }
    }
  }
  return '';
}

function classifyFailure(
  expected: string[],
  extracted: string[],
  rawPreview: string,
): string {
  if (expected.length === 0 && extracted.length === 0) return 'LLM missed obvious signal';
  if (expected.length > 0 && extracted.length === 0) {
    if (!rawPreview.includes('rawInterests')) return 'prompt too restrictive';
    return 'post-processing removed valid items';
  }
  if (expected.length > 0 && extracted.length > 0) return 'partial miss (LLM missed obvious signal)';
  return 'normalization issue';
}

async function main(): Promise<void> {
  const results: Array<{
    profileId: string;
    preview: string;
    rawPreview: string;
    expected: string[];
    extracted: string[];
    failure: string;
  }> = [];

  for (const profileId of PROFILE_IDS) {
    const raw = await readFile(join(PROFILES_DIR, `${profileId}.json`), 'utf8');
    const profile = JSON.parse(raw) as { texts?: { aboutMe?: string } };
    const aboutMe = profile.texts?.aboutMe ?? '';
    const preview = aboutMe.slice(0, 120).replace(/\s+/g, ' ').trim();

    const res = await fetch(
      `${API_BASE_URL}/api/profiles/${encodeURIComponent(profileId)}/analyze-v2?force=1`,
      { method: 'POST' },
    );
    const bodyText = await res.text();
    let extracted: string[] = [];
    if (res.ok) {
      const body = JSON.parse(bodyText) as {
        extraction?: { base?: { self?: { rawInterests?: string[] } } };
      };
      extracted = body.extraction?.base?.self?.rawInterests ?? [];
    }

    await new Promise((r) => setTimeout(r, 700));
    const fullLog = existsSync(LOG_PATH)
      ? readFileSync(LOG_PATH, 'utf8')
      : '';
    const block = parseLastAnalyzeBlock(fullLog, profileId);
    const rawPreview = extractSelfRawModelPreview(block);

    const expected = expectedInterests(aboutMe);
    const failure = classifyFailure(expected, extracted, rawPreview);
    results.push({ profileId, preview, rawPreview, expected, extracted, failure });
  }

  console.log('profileId\ttext_preview\traw_llm_output_preview\tself.rawInterests');
  for (const r of results) {
    console.log(
      `${r.profileId}\t${JSON.stringify(r.preview)}\t${JSON.stringify(r.rawPreview.slice(0, 160))}\t${JSON.stringify(r.extracted)}`,
    );
  }

  console.log('');
  console.log('profileId\texpected_interests\textracted_rawInterests\tfailure_reason');
  for (const r of results) {
    console.log(
      `${r.profileId}\t${JSON.stringify(r.expected)}\t${JSON.stringify(r.extracted)}\t${r.failure}`,
    );
  }

  const counts: Record<string, number> = {};
  for (const r of results) counts[r.failure] = (counts[r.failure] ?? 0) + 1;
  const top3 = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  console.log('');
  console.log('top_3_root_causes');
  for (const [k, v] of top3) console.log(`${k}: ${v}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

