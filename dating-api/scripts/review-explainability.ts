/**
 * Deterministic explainability quality review over data/matches/*.json.
 *
 * Run (from dating-api root):
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/review-explainability.ts
 *
 * Output: data/reports/explainability-quality-review.md (override with EXPLAINABILITY_REPORT_PATH)
 *
 * Env:
 *   MATCHES_DATA_DIR — default <cwd>/data/matches
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  analyzeExplainabilityRow,
  pairLabelFromRecord,
  type ExplainabilityReviewRowResult,
} from '../src/matches/explainability-review-heuristics';
import type { MatchExplainabilityDto } from '../src/matches/match-explainability';
import type { MatchRecordDto } from '../src/matches/match.types';

const ROOT = process.cwd();
const MATCHES_DIR =
  process.env.MATCHES_DATA_DIR?.trim() || join(ROOT, 'data', 'matches');
const REPORT_PATH =
  process.env.EXPLAINABILITY_REPORT_PATH?.trim() ||
  join(ROOT, 'data', 'reports', 'explainability-quality-review.md');

const TOP_LIST = 30;
const EXAMPLE_GOOD = 15;
const EXAMPLE_BAD = 15;

function isRecord(x: unknown): x is MatchRecordDto {
  return (
    x != null &&
    typeof x === 'object' &&
    'matchId' in x &&
    'a' in x &&
    'b' in x &&
    'overall' in x
  );
}

/**
 * Explainability quality scope: rows that actually carry an `explainability` payload on disk.
 * `policyVersion` alone is not reliable (many files can share it without persisting explainability).
 */
function hasExplainabilityPayload(rec: MatchRecordDto): boolean {
  return rec.explainability != null;
}

async function loadMatchRecords(): Promise<MatchRecordDto[]> {
  let entries: string[];
  try {
    entries = await readdir(MATCHES_DIR);
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') return [];
    throw e;
  }

  const out: MatchRecordDto[] = [];
  const files = entries.filter(
    (f) => f.endsWith('.json') && !f.endsWith('.json.tmp') && f !== 'index.json',
  );

  for (const f of files) {
    try {
      const raw = await readFile(join(MATCHES_DIR, f), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (isRecord(parsed)) out.push(parsed);
    } catch {
      // skip
    }
  }

  return out.sort((a, b) => a.matchId.localeCompare(b.matchId));
}

function esc(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function formatExampleRow(r: ExplainabilityReviewRowResult): string {
  const ex = r.explainability;
  const chips = ex?.positiveChips?.join(', ') ?? '—';
  const ten = ex?.tensionChip ?? '—';
  const reason = esc(ex?.reasonShort ?? '—');
  return `| ${esc(r.matchId)} | ${esc(r.pairLabel)} | ${r.finalScore} | ${r.friction ?? '—'} | ${chips} | ${esc(ten)} | ${reason} |`;
}

function chipHistogram(records: MatchRecordDto[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const rec of records) {
    const chips = rec.explainability?.positiveChips ?? [];
    for (const c of chips) {
      m.set(c, (m.get(c) ?? 0) + 1);
    }
  }
  return m;
}

function analyzeRecords(records: MatchRecordDto[]): ExplainabilityReviewRowResult[] {
  return records.map((rec) => {
    const finalScore = rec.finalScore ?? rec.overall;
    return analyzeExplainabilityRow({
      matchId: rec.matchId,
      pairLabel: pairLabelFromRecord(rec.a.name, rec.b.name),
      finalScore,
      compatibility: rec.compatibility,
      friction: rec.friction,
      explainability: rec.explainability as MatchExplainabilityDto | undefined,
    });
  });
}

interface ScopeStats {
  records: MatchRecordDto[];
  analyzed: ExplainabilityReviewRowResult[];
  n: number;
  withExCount: number;
  withTension: number;
  withExAndFriction3Plus: number;
  friction3PlusWithTensionCount: number;
  missingCount: number;
  boilerplateCount: number;
  sharedValuesShare: number;
  totalChipSlots: number;
  hist: Map<string, number>;
  verdictStable: boolean;
  flagCounts: Map<string, number>;
}

function computeScopeStats(records: MatchRecordDto[]): ScopeStats {
  const n = records.length;
  const analyzed = analyzeRecords(records);
  const withExCount = records.filter((r) => r.explainability != null).length;

  const withTension = analyzed.filter(
    (a) => a.explainability?.tensionChip != null && a.explainability.tensionChip !== '',
  ).length;

  const withExAndFriction3Plus = analyzed.filter(
    (a) => (a.friction ?? 0) >= 3 && a.explainability != null,
  ).length;

  const friction3PlusWithTensionCount = records.filter(
    (r) => (r.friction ?? 0) >= 3 && r.explainability?.tensionChip,
  ).length;

  const flagCounts = new Map<string, number>();
  for (const row of analyzed) {
    for (const f of row.flags) {
      flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);
    }
  }

  const hist = chipHistogram(records.filter((r) => r.explainability != null));
  const totalChipSlots = [...hist.values()].reduce((s, v) => s + v, 0);
  const sharedValuesShare =
    totalChipSlots === 0 ? 0 : (hist.get('Shared values') ?? 0) / totalChipSlots;

  const missingCount = analyzed.filter((a) => a.flags.includes('missing_explainability')).length;
  const boilerplateCount = analyzed.filter((a) =>
    a.flags.includes('boilerplate_no_chip_copy'),
  ).length;

  const verdictStable =
    n > 0 &&
    withExCount > 0 &&
    missingCount / n < 0.35 &&
    boilerplateCount / Math.max(1, withExCount) < 0.3 &&
    sharedValuesShare < 0.55;

  return {
    records,
    analyzed,
    n,
    withExCount,
    withTension,
    withExAndFriction3Plus,
    friction3PlusWithTensionCount,
    missingCount,
    boilerplateCount,
    sharedValuesShare,
    totalChipSlots,
    hist,
    verdictStable,
    flagCounts,
  };
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((10000 * part) / whole) / 100;
}

function verdictLines(
  label: string,
  stats: ScopeStats,
  opts: { isNoData: boolean; scopeIsExplainabilityPayloadOnly?: boolean },
): string[] {
  const { n, withExCount, missingCount, verdictStable } = stats;
  const lines: string[] = [];
  lines.push(`### ${label}`);
  lines.push('');
  if (opts.isNoData) {
    lines.push(
      '**NO_DATA** — No match JSON files found. Run match recompute / daemon, then re-run this script.',
    );
  } else if (withExCount === 0) {
    lines.push(
      '**RECOMPUTE_NEEDED** — Rows in this scope exist but none include `explainability`. Re-run compare/recompute with the engine that persists explainability, then re-run this script.',
    );
  } else if (verdictStable) {
    lines.push(
      '**STABLE (for product polish)** — Heuristic thresholds passed: explainability mostly present, boilerplate rate acceptable, “Shared values” not dominating chip slots.',
    );
  } else if (opts.scopeIsExplainabilityPayloadOnly) {
    lines.push(
      '**REVIEW_RECOMMENDED** — Among rows that already persist explainability: high boilerplate rate or “Shared values” concentration. See failure patterns for this scope below.',
    );
  } else {
    lines.push(
      '**REVIEW_RECOMMENDED** — High missing explainability, boilerplate rate, or “Shared values” concentration. See failure patterns below.',
    );
  }
  lines.push('');
  lines.push(
    opts.scopeIsExplainabilityPayloadOnly
      ? `_Scope: ${n} row(s) with \`explainability\` JSON (100% of this scope); \`missing_explainability\` flags in this scope: ${missingCount}._`
      : `_Scope size: ${n} row(s), ${withExCount} with explainability (${pct(withExCount, n)}%), ${missingCount} flagged missing._`,
  );
  lines.push('');
  return lines;
}

function distributionTable(title: string, stats: ScopeStats): string[] {
  const { n, withExCount, withTension, withExAndFriction3Plus, friction3PlusWithTensionCount } =
    stats;
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Records with \`explainability\` | ${withExCount} (${pct(withExCount, n)}%) |`);
  lines.push(`| Records with \`tensionChip\` (any friction) | ${withTension} (${pct(withTension, n)}%) |`);
  lines.push(
    `| Of friction ≥ 3 & has explainability: have \`tensionChip\` | ${friction3PlusWithTensionCount} / ${withExAndFriction3Plus} |`,
  );
  lines.push(`| Rows flagged \`missing_explainability\` | ${stats.missingCount} |`);
  lines.push(`| Rows flagged \`boilerplate_no_chip_copy\` | ${stats.boilerplateCount} |`);
  const boilerplateRate =
    withExCount === 0 ? 0 : stats.boilerplateCount / withExCount;
  lines.push(
    `| Boilerplate rate (among rows with explainability) | ${(boilerplateRate * 100).toFixed(1)}% |`,
  );
  lines.push(
    `| “Shared values” share of all positive chip slots | ${(stats.sharedValuesShare * 100).toFixed(1)}% |`,
  );
  lines.push('');
  return lines;
}

function chipHistogramSection(title: string, stats: ScopeStats): string[] {
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');
  if (stats.n === 0) {
    lines.push('_No rows in this scope._');
    lines.push('');
    return lines;
  }
  if (stats.withExCount === 0) {
    lines.push('_No explainability on disk in this scope — histogram skipped._');
    lines.push('');
    return lines;
  }
  const sortedHist = [...stats.hist.entries()].sort((a, b) => b[1] - a[1]);
  lines.push('| Label | Count | % of chip slots |');
  lines.push('| --- | ---: | ---: |');
  for (const [label, count] of sortedHist.slice(0, 20)) {
    const p = stats.totalChipSlots
      ? ((1000 * count) / stats.totalChipSlots / 10).toFixed(1)
      : '0';
    lines.push(`| ${esc(label)} | ${count} | ${p}% |`);
  }
  lines.push('');
  return lines;
}

function flagSection(title: string, flagCounts: Map<string, number>): string[] {
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');
  lines.push('| Flag | Count |');
  lines.push('| --- | ---: |');
  const sortedFlags = [...flagCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedFlags.length === 0) {
    lines.push('| _none_ | 0 |');
  } else {
    for (const [f, c] of sortedFlags) {
      lines.push(`| \`${f}\` | ${c} |`);
    }
  }
  lines.push('');
  return lines;
}

async function main(): Promise<void> {
  const records = await loadMatchRecords();
  const recordsExScope = records.filter(hasExplainabilityPayload);

  const statsAll = computeScopeStats(records);
  const statsExScope = computeScopeStats(recordsExScope);

  const hasExplainabilityOnDisk = statsAll.withExCount > 0;
  const primaryVerdictStats = hasExplainabilityOnDisk ? statsExScope : statsAll;

  const analyzed = statsAll.analyzed;
  const suspiciousSortedAll = [...analyzed].sort((a, b) => {
    if (b.suspiciousScore !== a.suspiciousScore) return b.suspiciousScore - a.suspiciousScore;
    return a.matchId.localeCompare(b.matchId);
  });

  const suspiciousSortedExScope = [...statsExScope.analyzed].sort((a, b) => {
    if (b.suspiciousScore !== a.suspiciousScore) return b.suspiciousScore - a.suspiciousScore;
    return a.matchId.localeCompare(b.matchId);
  });

  const n = records.length;
  const legacyWithoutEx = n - statsAll.withExCount;

  const topScoreWithEx = [...records]
    .filter((r) => r.explainability != null)
    .sort((a, b) => {
      const sa = a.finalScore ?? a.overall;
      const sb = b.finalScore ?? b.overall;
      if (sb !== sa) return sb - sa;
      return a.matchId.localeCompare(b.matchId);
    })
    .slice(0, TOP_LIST);

  const topFrictionWithTension = [...records]
    .filter((r) => (r.friction ?? 0) >= 3 && r.explainability?.tensionChip)
    .sort((a, b) => {
      const fa = a.friction ?? 0;
      const fb = b.friction ?? 0;
      if (fb !== fa) return fb - fa;
      return a.matchId.localeCompare(b.matchId);
    })
    .slice(0, TOP_LIST);

  const goodCandidates = analyzed.filter(
    (a) =>
      a.explainability != null &&
      a.flags.length === 0 &&
      (a.explainability.positiveChips?.length ?? 0) >= 1 &&
      a.finalScore >= 48,
  );
  goodCandidates.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return a.matchId.localeCompare(b.matchId);
  });
  const goodExamples = goodCandidates.slice(0, EXAMPLE_GOOD);

  const badExamplesSource = hasExplainabilityOnDisk ? suspiciousSortedExScope : suspiciousSortedAll;
  const badExamples = badExamplesSource.filter((a) => a.suspiciousScore > 0).slice(0, EXAMPLE_BAD);

  const lines: string[] = [];
  lines.push('# Explainability quality review');
  lines.push('');
  lines.push(`- **Generated:** ${new Date().toISOString()}`);
  lines.push(`- **Matches directory:** \`${MATCHES_DIR}\``);
  lines.push(`- **Match files loaded (all):** ${n}`);
  lines.push(
    `- **Explainability quality scope:** rows with non-null \`explainability\` JSON → ${statsExScope.n} row(s) (${pct(statsExScope.n, n)}% of files)`,
  );
  if (legacyWithoutEx > 0) {
    lines.push(
      `- **Legacy / incomplete on disk:** ${legacyWithoutEx} file(s) omit \`explainability\` (counted only in “all loaded files” sections)`,
    );
  }
  lines.push('');

  lines.push('## Verdict');
  lines.push('');
  if (n === 0) {
    lines.push(...verdictLines('Primary', statsAll, { isNoData: true }));
  } else {
    lines.push(
      hasExplainabilityOnDisk
        ? '_**Primary verdict** uses only rows whose JSON includes an `explainability` object — the real explainability dataset. Files without it are legacy/incomplete and appear only in full-dataset tables (so `missing_explainability` does not drown quality signals here)._'
        : '_No `explainability` on any file — primary verdict reflects the full loaded set._',
    );
    lines.push('');
    lines.push(
      ...verdictLines(
        hasExplainabilityOnDisk ? 'Primary (explainability dataset)' : 'Primary (full dataset)',
        primaryVerdictStats,
        {
          isNoData: false,
          scopeIsExplainabilityPayloadOnly: hasExplainabilityOnDisk,
        },
      ),
    );

    if (hasExplainabilityOnDisk && legacyWithoutEx > 0) {
      lines.push('### Full on-disk context (all loaded files)');
      lines.push('');
      lines.push(
        '_Includes legacy rows without `explainability`; flag totals here are often dominated by `missing_explainability`._',
      );
      lines.push('');
      if (statsAll.verdictStable) {
        lines.push(
          '**STABLE (for product polish)** — Same heuristic thresholds on the full file set (misleading if most rows lack explainability; trust primary above).',
        );
      } else {
        lines.push(
          '**REVIEW_RECOMMENDED** — Full file set fails heuristics, largely due to omitted explainability on older rows. Prefer the primary verdict for copy/chip quality.',
        );
      }
      lines.push('');
      lines.push(
        `_Full dataset: ${statsAll.n} row(s), ${statsAll.withExCount} with explainability (${pct(statsAll.withExCount, statsAll.n)}%)._`,
      );
      lines.push('');
    }
  }

  lines.push('## Scope overview');
  lines.push('');
  lines.push('| Scope | Rows | With `explainability` |');
  lines.push('| --- | ---: | ---: |');
  lines.push(`| All loaded files | ${statsAll.n} | ${statsAll.withExCount} |`);
  lines.push(
    '| Explainability quality scope (`explainability` present) | ' +
      `${statsExScope.n} | ${statsExScope.n} (by definition) |`,
  );
  lines.push('');

  lines.push(...distributionTable('Distribution — all loaded files', statsAll));

  if (statsExScope.n > 0) {
    lines.push(
      ...distributionTable(
        'Current explainability dataset — rows with `explainability` JSON only',
        statsExScope,
      ),
    );
  } else if (n > 0) {
    lines.push('## Current explainability dataset — rows with `explainability` JSON only');
    lines.push('');
    lines.push(
      '_No rows include `explainability` — run match recompute (or compare) with a build that persists explainability, then re-run this report._',
    );
    lines.push('');
  }

  lines.push('## Top 30 highest `finalScore` with explainability (all loaded files)');
  lines.push('');
  lines.push('| matchId | pair | finalScore | friction | chips | tension | reason (trimmed) |');
  lines.push('| --- | --- | ---: | ---: | --- | --- | --- |');
  for (const r of topScoreWithEx) {
    const row = analyzeExplainabilityRow({
      matchId: r.matchId,
      pairLabel: pairLabelFromRecord(r.a.name, r.b.name),
      finalScore: r.finalScore ?? r.overall,
      compatibility: r.compatibility,
      friction: r.friction,
      explainability: r.explainability as MatchExplainabilityDto,
    });
    lines.push(formatExampleRow(row));
  }
  lines.push('');

  lines.push('## Top 30 friction ≥ 3 with `tensionChip` (all loaded files)');
  lines.push('');
  lines.push('| matchId | pair | finalScore | friction | chips | tension | reason (trimmed) |');
  lines.push('| --- | --- | ---: | ---: | --- | --- | --- |');
  for (const r of topFrictionWithTension) {
    const row = analyzeExplainabilityRow({
      matchId: r.matchId,
      pairLabel: pairLabelFromRecord(r.a.name, r.b.name),
      finalScore: r.finalScore ?? r.overall,
      compatibility: r.compatibility,
      friction: r.friction,
      explainability: r.explainability as MatchExplainabilityDto,
    });
    lines.push(formatExampleRow(row));
  }
  lines.push('');

  if (statsExScope.n > 0) {
    lines.push(
      ...chipHistogramSection(
        'Positive chip frequency — explainability dataset only',
        statsExScope,
      ),
    );
  } else {
    lines.push('## Positive chip frequency — explainability dataset only');
    lines.push('');
    lines.push('_Skipped: no `explainability` payloads on disk._');
    lines.push('');
  }

  lines.push(...flagSection('Grouped failure patterns — all loaded files', statsAll.flagCounts));

  if (statsExScope.n > 0) {
    lines.push(
      ...flagSection(
        'Grouped failure patterns — explainability dataset only',
        statsExScope.flagCounts,
      ),
    );
  }

  lines.push('## Weak / generic signals (heuristic)');
  lines.push('');
  lines.push(
    '- **Duplicate chips (same match):** `duplicate_positive_chip` — should never happen from engine; indicates bad stored JSON.',
  );
  lines.push(
    '- **Unknown chip labels:** `unknown_positive_chip` / `unknown_tension_chip_label` — label not in current fixed dictionaries (stale client or engine drift).',
  );
  lines.push(
    '- **Generic copy:** `boilerplate_no_chip_copy` — empty chips + legacy boilerplate fragments (e.g. “limited highlighted alignments”, “strongest highlight tier”).',
  );
  lines.push(
    '- **Tension inconsistency:** `high_friction_no_tension_chip` or `tension_chip_when_friction_low` — data vs rule mismatch.',
  );
  lines.push(
    '- **Narrative vs score:** `narrative_strong_vs_low_final_score` — “Strong overlap” wording with `finalScore` < 42.',
  );
  lines.push('');

  lines.push(`## ${EXAMPLE_GOOD} examples (low suspicion, has chips, score ≥ 48) — all loaded files`);
  lines.push('');
  if (goodExamples.length === 0) {
    lines.push('_No rows matched strict “good” criteria._');
  } else {
    lines.push('| matchId | pair | finalScore | friction | chips | tension | reason |');
    lines.push('| --- | --- | ---: | ---: | --- | --- | --- |');
    for (const row of goodExamples) {
      lines.push(formatExampleRow(row));
    }
  }
  lines.push('');

  lines.push(
    `## ${EXAMPLE_BAD} suspicious examples (highest suspicion) — ${hasExplainabilityOnDisk ? 'explainability dataset only' : 'all loaded files (no explainability JSON on disk)'}`,
  );
  lines.push('');
  if (badExamples.length === 0) {
    lines.push(
      hasExplainabilityOnDisk
        ? '_No suspicious rows in the explainability dataset scope._'
        : '_No suspicious rows._',
    );
  } else {
    lines.push('| matchId | pair | finalScore | friction | flags | chips | reason |');
    lines.push('| --- | --- | ---: | ---: | --- | --- | --- |');
    for (const row of badExamples) {
      const ex = row.explainability;
      const chips = ex?.positiveChips?.join(', ') ?? '—';
      lines.push(
        `| ${esc(row.matchId)} | ${esc(row.pairLabel)} | ${row.finalScore} | ${row.friction ?? '—'} | ${row.flags.map((f) => `\`${f}\``).join(', ')} | ${esc(chips)} | ${esc(ex?.reasonShort ?? '—')} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Notes');
  lines.push('');
  lines.push(
    '- This report is **deterministic** from on-disk JSON; it does not call LLMs or recompute scores.',
  );
  lines.push(
    '- Re-run after recompute so `explainability` reflects the latest `match-explainability` rules.',
  );
  lines.push(
    '- **Explainability quality scope** = any match file whose JSON includes a non-null `explainability` field. This isolates real explainability output from legacy files that omit it (even if `policyVersion` matches).',
  );
  lines.push(
    '- **Full-dataset** sections still include every loaded file so you can see overall `missing_explainability` volume.',
  );
  lines.push('');

  await mkdir(join(ROOT, 'data', 'reports'), { recursive: true });
  await writeFile(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`Wrote ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
