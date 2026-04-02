/**
 * Audit enrichment API contract vs closed canonical labels (DecisionEngineV1 / final-rule-signal-mapper).
 *
 * Run: npx tsx scripts/audit-enrichment-contract.ts
 * Needs: http://localhost:3001/api/v1/profiles
 */

import {
  FINAL_AUTONOMY_LABELS,
  FINAL_CONFLICT_LABELS,
  FINAL_KIDS_LABELS,
  FINAL_RHYTHM_LABELS,
} from '../src/lib/final-rule-signal-mapper';

const API = 'http://localhost:3001/api/v1';
const SAMPLE = 50;

type Family = 'kids' | 'conflict' | 'rhythm' | 'autonomy';
type Kind = 'exact' | 'phrase' | 'null';

const SETS: Record<Family, ReadonlySet<string>> = {
  kids: new Set(FINAL_KIDS_LABELS),
  conflict: new Set(FINAL_CONFLICT_LABELS),
  rhythm: new Set(FINAL_RHYTHM_LABELS),
  autonomy: new Set(FINAL_AUTONOMY_LABELS),
};

const EXPECTED_LABELS_TEXT: Record<Family, string> = {
  kids: `kids: ${FINAL_KIDS_LABELS.join(', ')}`,
  conflict: `conflict: ${FINAL_CONFLICT_LABELS.join(', ')}`,
  rhythm: `rhythm: ${FINAL_RHYTHM_LABELS.join(', ')}`,
  autonomy: `autonomy: ${FINAL_AUTONOMY_LABELS.join(', ')}`,
};

type Row = {
  family: Family;
  field: string;
  raw: string | null;
  kind: Kind;
};

function classify(family: Family, value: unknown): { kind: Kind; raw: string | null } {
  if (value == null) return { kind: 'null', raw: null };
  if (typeof value !== 'string') return { kind: 'phrase', raw: String(value) };
  const t = value.trim();
  if (!t) return { kind: 'null', raw: null };
  if (SETS[family].has(t)) return { kind: 'exact', raw: t };
  return { kind: 'phrase', raw: t };
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<Record<string, unknown>>;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function main(): Promise<void> {
  const list = await fetchJson(`${API}/profiles`);
  const items = (list.items as { id: string; name: string }[] | undefined) ?? [];
  if (items.length === 0) {
    console.error('No profiles from API');
    process.exit(1);
  }

  const picked = shuffle(items, Math.random).slice(0, Math.min(SAMPLE, items.length));

  const totals = { exact: 0, phrase: 0, null: 0 };
  const byFamily: Record<Family, { exact: number; phrase: number; null: number }> = {
    kids: { exact: 0, phrase: 0, null: 0 },
    conflict: { exact: 0, phrase: 0, null: 0 },
    rhythm: { exact: 0, phrase: 0, null: 0 },
    autonomy: { exact: 0, phrase: 0, null: 0 },
  };

  const phraseCounts = new Map<string, number>();
  const badExamples: Array<{
    id: string;
    name: string;
    family: Family;
    field: string;
    raw: string;
    kind: Kind;
  }> = [];

  console.log('=== Enrichment output contract audit ===\n');
  console.log('Expected canonical label sets (exact string match required):\n');
  for (const f of ['kids', 'conflict', 'rhythm', 'autonomy'] as Family[]) {
    console.log(`  ${EXPECTED_LABELS_TEXT[f]}`);
  }
  console.log('');

  for (const p of picked) {
    const data = await fetchJson(`${API}/profiles/${encodeURIComponent(p.id)}`);
    const profile = data.profile as Record<string, unknown> | undefined;
    const evaluation = profile?.evaluation as Record<string, unknown> | undefined;
    const enrichment = evaluation?.enrichment as Record<string, unknown> | undefined;
    const sig = enrichment?.signals as Record<string, unknown> | undefined;
    const rows: Row[] = [
      {
        family: 'kids',
        field: 'kidsTimeline',
        ...classify('kids', sig?.kidsTimeline),
      },
      {
        family: 'conflict',
        field: 'conflictStyleDetail',
        ...classify('conflict', sig?.conflictStyleDetail),
      },
      {
        family: 'rhythm',
        field: 'dailyRhythm',
        ...classify('rhythm', sig?.dailyRhythm),
      },
      {
        family: 'autonomy',
        field: 'autonomyTogethernessDepth',
        ...classify('autonomy', sig?.autonomyTogethernessDepth),
      },
    ];

    console.log(`--- ${p.name} (${p.id}) ---`);
    for (const r of rows) {
      totals[r.kind]++;
      byFamily[r.family][r.kind]++;
      if (r.kind === 'phrase' && r.raw) {
        phraseCounts.set(r.raw, (phraseCounts.get(r.raw) ?? 0) + 1);
        if (badExamples.length < 30) {
          badExamples.push({
            id: p.id,
            name: p.name,
            family: r.family,
            field: r.field,
            raw: r.raw,
            kind: 'phrase',
          });
        }
      }
      const status =
        r.kind === 'exact' ? 'EXACT' : r.kind === 'null' ? 'NULL' : `PHRASE("${r.raw}")`;
      console.log(`  ${r.field}: ${sig?.[r.field] === undefined ? '(missing)' : JSON.stringify(sig?.[r.field])} → ${status}`);
    }
    console.log('');
  }

  const nFields = picked.length * 4;
  const pct = (x: number) => (nFields === 0 ? '0.0' : ((x / nFields) * 100).toFixed(1));

  console.log('=== Aggregate (all sampled profiles × 4 fields) ===\n');
  console.log(`Observations: ${nFields}`);
  console.log(`% exact canonical: ${pct(totals.exact)}% (${totals.exact})`);
  console.log(`% phrase-style (non-null, not in closed set): ${pct(totals.phrase)}% (${totals.phrase})`);
  console.log(`% null / empty: ${pct(totals.null)}% (${totals.null})`);
  console.log('');

  console.log('=== Breakdown by family (per field, N = sample size) ===\n');
  const n = picked.length;
  const p = (x: number) => (n === 0 ? '0.0' : ((x / n) * 100).toFixed(1));
  for (const fam of ['kids', 'conflict', 'rhythm', 'autonomy'] as Family[]) {
    const b = byFamily[fam];
    console.log(
      `${fam}: exact ${p(b.exact)}% (${b.exact}) | phrase ${p(b.phrase)}% (${b.phrase}) | null ${p(b.null)}% (${b.null})`,
    );
  }
  console.log('');

  const topPhrases = [...phraseCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log('=== Top 5 contract failures (most frequent phrase-style raw values) ===\n');
  topPhrases.forEach(([s, c], i) => {
    console.log(`  ${i + 1}. (${c}×) ${JSON.stringify(s)}`);
  });
  if (topPhrases.length === 0) {
    console.log('  (none — no phrase-style values in sample)');
  }
  console.log('');

  console.log('=== 10 concrete bad examples (phrase-style or structural issues) ===\n');
  const ten = badExamples.slice(0, 10);
  if (ten.length === 0) {
    console.log('  (none in sample)');
  } else {
    ten.forEach((ex, i) => {
      console.log(
        `  ${i + 1}. ${ex.name} (${ex.id}) | ${ex.field} [${ex.family}] = ${JSON.stringify(ex.raw)}`,
      );
    });
  }
  console.log('');

  const phrasePct = nFields ? (totals.phrase / nFields) * 100 : 0;
  const nullPct = nFields ? (totals.null / nFields) * 100 : 0;
  const exactPct = nFields ? (totals.exact / nFields) * 100 : 0;

  console.log('=== Recommendation ===\n');
  if (nullPct > 60 && phrasePct > 5) {
    console.log(
      'Nulls dominate overall, but many non-null values are phrase-style (not closed labels). Two layers:',
    );
    console.log(
      '  1) Extraction coverage: raise fill-rate for kids / conflict / rhythm / autonomy (prompts, schema, backfill).',
    );
    console.log(
      '  2) Vocabulary contract: when the model does emit text, persist exact canonical codes — or one server-side post-extraction mapper from known phrases to codes.',
    );
    console.log(
      '  Prefer fixing the extractor to emit codes end-to-end; use a mapper only as a compatibility shim for stored legacy rows.',
    );
  } else if (phrasePct >= nullPct && phrasePct > 15) {
    console.log(
      'Phrase-style values are a major share of non-null output. The API is not emitting the closed vocabulary.',
    );
    console.log(
      '  • Fix the evaluate/extraction pipeline to persist exact canonical strings (FINAL_* sets).',
    );
    console.log(
      '  • Optional: post-extraction mapper at API/persistence boundary for legacy phrase payloads (single place, not UI).',
    );
  } else if (nullPct > 60) {
    console.log(
      'Nulls dominate. Enrichment coverage / extraction is not populating these four fields for most profiles.',
    );
    console.log('  • Fix extractor prompts, validation, or backfill; mapping alone cannot recover missing fields.');
  } else if (exactPct > 70) {
    console.log('Contract largely satisfied in this sample; tune remaining phrase/null edge cases.');
  } else {
    console.log(
      'Mixed failure modes: improve extractor canonical output and/or add a controlled server-side map for known legacy phrases.',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
