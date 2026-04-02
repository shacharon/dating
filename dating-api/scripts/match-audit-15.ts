/**
 * One-off audit: pick 15 real DB profiles, ensure analyze + V2 row for compare,
 * run MatchesService.compare for all pairs, write docs/match-audit-15.md.
 *
 * Idempotent: same selection order (SQL) each run; compare reuses production MatchesService (persists matches JSON like the app).
 *
 * Run from dating-api (DATABASE_URL + LLM keys as for normal API):
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/match-audit-15.ts
 * Or: npm run audit:match-15
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import type { EvaluateBatchResult } from '../src/evaluate/evaluate.service';
import { EvaluateService } from '../src/evaluate/evaluate.service';
import { ExtractionV2PersistenceService } from '../src/extraction/extraction-v2-persistence.service';
import { analyzeExplainabilityRow } from '../src/matches/explainability-review-heuristics';
import type { CompareServiceResult } from '../src/matches/matches.service';
import { MatchesService } from '../src/matches/matches.service';
import type { ProfileJsonPayload } from '../src/profiles/profiles-json.service';
import { ProfilesPrismaService } from '../src/profiles/profiles-prisma.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { HANDMADE_PROFILES } from './handmade-profiles.data';

/** Keep in sync with ProfilesAnalyzeController (skip / cache behavior). */
const PROMPT_VERSION = 'v1';
const POLICY_VERSION = 'product-score-v1';

const API_ROOT = join(__dirname, '..');
const REPORT_PATH = join(API_ROOT, 'docs', 'match-audit-15.md');

const PROFILE_LIMIT = 15;

function isAnalyzed(profile: ProfileJsonPayload): boolean {
  if (!profile.evaluatedAt) return false;
  const signals = profile.signals ?? profile.evaluation?.self?.signals;
  if (!signals || typeof signals !== 'object') return false;
  if (!Object.values(signals).some((v) => v != null)) return false;
  if ((profile.promptVersion ?? '') !== PROMPT_VERSION) return false;
  if ((profile.policyVersion ?? '') !== POLICY_VERSION) return false;
  return true;
}

/** Product-style cue from recommendation.suggestedNextAction (engine uses full phrases, not TALK/SKIP tokens). */
function mapDecisionCue(suggested: string | undefined | null): string {
  if (!suggested) return '—';
  const s = suggested.trim();
  if (/start a conversation/i.test(s)) return 'TALK';
  if (/review profile and message/i.test(s)) return 'TALK';
  if (/worth a closer look/i.test(s)) return 'SLOW DOWN';
  if (/skim profile first/i.test(s)) return 'SLOW DOWN';
  if (/consider other matches/i.test(s)) return 'SKIP';
  return s;
}

function mdCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function mdTable(headers: string[], rows: string[][]): string {
  const h = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n');
  return `${h}\n${sep}\n${body}`;
}

interface SelectedRow {
  id: string;
  name: string;
}

interface ProfileAuditRow {
  profileId: string;
  label: string;
  analyzed: boolean;
  coverage: string;
  confidence: string;
  notes: string;
}

interface PairAuditRow {
  profileA: string;
  profileB: string;
  finalScore: string;
  decisionCue: string;
  primaryReason: string;
  flags: string;
  status: string;
  suspiciousFlags: string;
  /** True when infoFlags, low coverage, or low confidence suggest reading details. */
  trustNeedsDetails: boolean;
}

function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

async function selectRealProfiles(prisma: PrismaService): Promise<SelectedRow[]> {
  const handmadeIds = HANDMADE_PROFILES.map((p) => p.id);
  const idList = handmadeIds.map((id) => Prisma.sql`${id}`);

  const rows = await prisma.$queryRaw<SelectedRow[]>`
    SELECT id, name
    FROM "UserProfile"
    WHERE id NOT IN (${Prisma.join(idList)})
      AND id !~* '^(demo|test|stub|seed|handmade_)'
      AND name !~* '(demo|test user|stub|handmade|seed|placeholder)'
      AND char_length(trim("aboutMe")) >= 20
    ORDER BY
      (CASE WHEN coalesce(trim("aboutPartner"), '') <> '' THEN 1 ELSE 0 END
        + CASE WHEN coalesce(trim("aboutRelationship"), '') <> '' THEN 1 ELSE 0 END) DESC,
      char_length(trim("aboutMe"))
        + coalesce(char_length(trim("aboutPartner")), 0)
        + coalesce(char_length(trim("aboutRelationship")), 0) DESC,
      id ASC
    LIMIT ${PROFILE_LIMIT}
  `;

  return rows;
}

async function ensureAnalyzedAndV2(
  profileId: string,
  profilesPrisma: ProfilesPrismaService,
  prisma: PrismaService,
  evaluateService: EvaluateService,
  extractionV2Persistence: ExtractionV2PersistenceService,
): Promise<{
  analyzedAlready: boolean;
  ranLlm: boolean;
  v2BackfillOnly: boolean;
  coverage: number | null;
  confidence: number | null;
}> {
  const profile = await profilesPrisma.getById(profileId);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const v2Row = await prisma.profileExtractionV2.findUnique({
    where: { profileId },
    select: { profileId: true },
  });

  if (isAnalyzed(profile) && v2Row) {
    const ev = profile.evaluation;
    const confidence =
      (ev.self.confidence + ev.partner.confidence + ev.relationship.confidence) / 3;
    return {
      analyzedAlready: true,
      ranLlm: false,
      v2BackfillOnly: false,
      coverage: ev.productScores?.coverageScore ?? null,
      confidence,
    };
  }

  if (isAnalyzed(profile) && !v2Row) {
    await extractionV2Persistence.saveExtendedSignalsFromEvaluation({
      profileId: profile.id,
      aboutMe: profile.texts.aboutMe,
      aboutPartner: profile.texts.aboutPartner,
      aboutRelationship: profile.texts.aboutRelationship,
      evaluation: profile.evaluation,
    });
    const ev = profile.evaluation;
    const confidence =
      (ev.self.confidence + ev.partner.confidence + ev.relationship.confidence) / 3;
    return {
      analyzedAlready: true,
      ranLlm: false,
      v2BackfillOnly: true,
      coverage: ev.productScores?.coverageScore ?? null,
      confidence,
    };
  }

  const { result: evaluation } = await evaluateService.evaluateBatch({
    aboutMe: profile.texts.aboutMe,
    aboutRelationship: profile.texts.aboutRelationship,
    aboutPartner: profile.texts.aboutPartner,
    profileId: profile.id,
  });

  const updatedAt = new Date().toISOString();
  const policyVersionSaved = evaluation.productScores?.policyVersion ?? POLICY_VERSION;

  const textConcat =
    (profile.texts.aboutMe ?? '') +
    '|' +
    (profile.texts.aboutPartner ?? '') +
    '|' +
    (profile.texts.aboutRelationship ?? '');
  const textHash = hashText(textConcat);

  await profilesPrisma.save(profile.id, {
    id: profile.id,
    name: profile.name,
    texts: profile.texts,
    evaluation,
    evaluationStatus: 'DONE',
    evaluatedAt: updatedAt,
    promptVersion: PROMPT_VERSION,
    policyVersion: policyVersionSaved,
    textHash,
    signals: evaluation.self.signals,
  });

  await extractionV2Persistence.saveExtendedSignalsFromEvaluation({
    profileId: profile.id,
    aboutMe: profile.texts.aboutMe,
    aboutPartner: profile.texts.aboutPartner,
    aboutRelationship: profile.texts.aboutRelationship,
    evaluation,
  });

  const confidence =
    (evaluation.self.confidence +
      evaluation.partner.confidence +
      evaluation.relationship.confidence) /
    3;

  return {
    analyzedAlready: false,
    ranLlm: true,
    v2BackfillOnly: false,
    coverage: evaluation.productScores?.coverageScore ?? null,
    confidence,
  };
}

function pairLabel(aName: string, bName: string): string {
  return `${aName} / ${bName}`;
}

function summarizePair(
  aId: string,
  bId: string,
  aName: string,
  bName: string,
  cmp: CompareServiceResult,
): PairAuditRow {
  const base: PairAuditRow = {
    profileA: `${aName} (${aId})`,
    profileB: `${bName} (${bId})`,
    finalScore: '—',
    decisionCue: '—',
    primaryReason: '—',
    flags: '—',
    status: cmp.status,
    suspiciousFlags: '—',
    trustNeedsDetails: false,
  };

  if (cmp.status !== 'READY') {
    base.primaryReason = cmp.match.message ?? '—';
    return base;
  }

  const m = cmp.match;
  base.finalScore = String(m.finalScore ?? m.overall ?? '—');
  const suggested = m.recommendation?.suggestedNextAction;
  base.decisionCue = `${mapDecisionCue(suggested)} (${suggested ?? 'n/a'})`;
  base.primaryReason =
    m.explainability?.reasonShort ?? m.recommendation?.primaryTakeaway ?? '—';

  const nInfo = m.infoFlags?.length ?? 0;
  const info = nInfo > 0 ? `infoFlags(${nInfo})=${JSON.stringify(m.infoFlags)}` : '';
  const cov = m.coveragePercent != null ? `coveragePct=${m.coveragePercent}` : '';
  const conf = m.confidence != null ? `confidence=${m.confidence}` : '';
  base.flags = [info, cov, conf].filter(Boolean).join('; ') || '—';

  const covN = m.coveragePercent ?? 100;
  const confN = m.confidence ?? 1;
  base.trustNeedsDetails = nInfo > 0 || covN < 50 || confN < 0.75;

  const review = analyzeExplainabilityRow({
    matchId: m.matchId,
    pairLabel: pairLabel(aName, bName),
    finalScore: m.finalScore ?? 0,
    compatibility: m.compatibility,
    friction: m.friction,
    explainability: m.explainability,
  });
  base.suspiciousFlags =
    review.flags.length > 0 ? review.flags.join(', ') : '—';

  return base;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const profilesPrisma = app.get(ProfilesPrismaService);
  const evaluateService = app.get(EvaluateService);
  const extractionV2Persistence = app.get(ExtractionV2PersistenceService);
  const matchesService = app.get(MatchesService);

  const selected = await selectRealProfiles(prisma);
  if (selected.length < PROFILE_LIMIT) {
    console.warn(
      `[match-audit-15] Only ${selected.length} profiles matched filters (expected ${PROFILE_LIMIT}). Report will use available rows.`,
    );
  }

  const profileTable: ProfileAuditRow[] = [];
  let reused = 0;
  let ranLlm = 0;
  let v2Backfill = 0;

  for (const row of selected) {
    const meta = await ensureAnalyzedAndV2(
      row.id,
      profilesPrisma,
      prisma,
      evaluateService,
      extractionV2Persistence,
    );
    if (meta.analyzedAlready && !meta.v2BackfillOnly) reused++;
    if (meta.ranLlm) ranLlm++;
    if (meta.v2BackfillOnly) v2Backfill++;

    const analyzed = meta.ranLlm || meta.analyzedAlready || meta.v2BackfillOnly;
    profileTable.push({
      profileId: row.id,
      label: row.name,
      analyzed,
      coverage: meta.coverage != null ? String(meta.coverage) : 'n/a',
      confidence:
        meta.confidence != null ? meta.confidence.toFixed(2) : 'n/a',
      notes: meta.ranLlm
        ? 'Ran evaluateBatch + V2 sidecar'
        : meta.v2BackfillOnly
          ? 'Reused evaluation; backfilled ProfileExtractionV2 from evaluation'
          : 'Reused existing analysis',
    });
  }

  const idToName = new Map(selected.map((r) => [r.id, r.name]));
  const pairRows: PairAuditRow[] = [];
  const readyResults: { row: PairAuditRow; score: number }[] = [];

  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const aId = selected[i]!.id;
      const bId = selected[j]!.id;
      const aName = idToName.get(aId) ?? aId;
      const bName = idToName.get(bId) ?? bId;
      try {
        const cmp = await matchesService.compare({ aId, bId });
        const row = summarizePair(aId, bId, aName, bName, cmp);
        pairRows.push(row);
        if (cmp.status === 'READY') {
          const sc = cmp.match.finalScore ?? cmp.match.overall ?? 0;
          readyResults.push({ row, score: sc });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        pairRows.push({
          profileA: `${aName} (${aId})`,
          profileB: `${bName} (${bId})`,
          finalScore: '—',
          decisionCue: '—',
          primaryReason: mdCell(msg).slice(0, 200),
          flags: '—',
          status: 'ERROR',
          suspiciousFlags: '—',
          trustNeedsDetails: false,
        });
      }
    }
  }

  const sortedDesc = [...readyResults].sort((x, y) => y.score - x.score);
  const sortedAsc = [...readyResults].sort((x, y) => x.score - y.score);
  const topStrong = sortedDesc.slice(0, 5).map((x) => x.row);
  const topWeak = sortedAsc.slice(0, 5).map((x) => x.row);

  const suspiciousPairs = pairRows.filter(
    (r) => r.status === 'READY' && r.suspiciousFlags !== '—',
  );

  const trustGapPairs = pairRows.filter(
    (r) => r.status === 'READY' && r.trustNeedsDetails,
  );

  const actionCounts = new Map<string, number>();
  const reasonCounts = new Map<string, number>();
  for (const r of pairRows) {
    if (r.status !== 'READY') continue;
    const cue = r.decisionCue.split(' ')[0] ?? '';
    actionCounts.set(cue, (actionCounts.get(cue) ?? 0) + 1);
    const key = r.primaryReason.slice(0, 80).trim() || '(empty)';
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  const recurringActions = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `- ${k}: ${v} pairs`)
    .join('\n');
  const recurringReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => `- (${v}×) ${k}${k.length >= 80 ? '…' : ''}`)
    .join('\n');

  const generatedAt = new Date().toISOString();
  const md: string[] = [];
  md.push(`# Match audit — 15 real profiles`);
  md.push('');
  md.push(`Generated: ${generatedAt} (UTC)`);
  md.push('');
  md.push('## Selection criteria');
  md.push('');
  md.push(
    '- Real `UserProfile` rows only; excluded handmade seed IDs, IDs matching `demo|test|stub|seed|handmade_`, and names matching demo/test/stub/handmade/seed/placeholder.',
  );
  md.push('- Prefer profiles with non-empty partner + relationship text, then longest total text; `aboutMe` at least 20 characters.');
  md.push(`- Limit: ${PROFILE_LIMIT} profiles.`);
  md.push('');
  md.push('## Analyze / V2');
  md.push('');
  md.push(
    '- Reused evaluation when `promptVersion`/`policyVersion` match current analyze controller and signals exist.',
  );
  md.push(
    '- `ProfileExtractionV2` is required for `MatchesService.compare`; missing rows were backfilled via `saveExtendedSignalsFromEvaluation` (same as HTTP analyze path).',
  );
  md.push('');
  md.push('## Selected profiles');
  md.push('');
  md.push(
    mdTable(
      ['profileId', 'label', 'analyzed?', 'coverage', 'avg confidence', 'notes'],
      profileTable.map((p) => [
        p.profileId,
        p.label,
        p.analyzed ? 'yes' : 'no',
        p.coverage,
        p.confidence,
        p.notes,
      ]),
    ),
  );
  md.push('');
  md.push('## Pair results (all unique pairs)');
  md.push('');
  md.push(
    mdTable(
      [
        'profileA',
        'profileB',
        'finalScore',
        'decision cue',
        'primaryReason',
        'flags / diagnostics',
        'compare status',
        'review flags',
      ],
      pairRows.map((p) => [
        p.profileA,
        p.profileB,
        p.finalScore,
        p.decisionCue,
        p.primaryReason,
        p.flags,
        p.status,
        p.suspiciousFlags,
      ]),
    ),
  );
  md.push('');
  md.push('## Summary');
  md.push('');
  md.push('### Top 5 strongest pairs (by finalScore, READY only)');
  md.push('');
  if (topStrong.length === 0) {
    md.push('*(No READY pairs — check compare errors or insufficient data.)*');
  } else {
    md.push(
      mdTable(
        ['profileA', 'profileB', 'finalScore', 'decision cue', 'primaryReason'],
        topStrong.map((p) => [
          p.profileA,
          p.profileB,
          p.finalScore,
          p.decisionCue,
          p.primaryReason,
        ]),
      ),
    );
  }
  md.push('');
  md.push('### Top 5 weakest pairs (by finalScore, READY only)');
  md.push('');
  if (topWeak.length === 0) {
    md.push('*(No READY pairs.)*');
  } else {
    md.push(
      mdTable(
        ['profileA', 'profileB', 'finalScore', 'decision cue', 'primaryReason'],
        topWeak.map((p) => [
          p.profileA,
          p.profileB,
          p.finalScore,
          p.decisionCue,
          p.primaryReason,
        ]),
      ),
    );
  }
  md.push('');
  md.push('### Pairs where hero/reason look generic or suspicious');
  md.push('');
  md.push(
    'Heuristic: `explainability-review-heuristics` flags (boilerplate copy, short reason, chip/reason mismatch, etc.).',
  );
  md.push('');
  if (suspiciousPairs.length === 0) {
    md.push('*(None flagged.)*');
  } else {
    md.push(
      mdTable(
        ['profileA', 'profileB', 'finalScore', 'primaryReason', 'review flags'],
        suspiciousPairs.map((p) => [
          p.profileA,
          p.profileB,
          p.finalScore,
          p.primaryReason,
          p.suspiciousFlags,
        ]),
      ),
    );
  }
  md.push('');
  md.push('### Pairs where details/flags seem necessary to trust the outcome');
  md.push('');
  md.push(
    'Heuristic: non-empty `infoFlags`, or match `coveragePercent` under 50, or `confidence` under 0.75 (when present on record).',
  );
  md.push('');
  if (trustGapPairs.length === 0) {
    md.push('*(None matched heuristic.)*');
  } else {
    md.push(
      mdTable(
        ['profileA', 'profileB', 'finalScore', 'flags / diagnostics', 'primaryReason'],
        trustGapPairs.map((p) => [
          p.profileA,
          p.profileB,
          p.finalScore,
          p.flags,
          p.primaryReason,
        ]),
      ),
    );
  }
  md.push('');
  md.push('### Recurring pattern notes');
  md.push('');
  md.push('Decision cue buckets (first token = TALK / SLOW DOWN / SKIP mapping):');
  md.push('');
  md.push(recurringActions || '*(n/a)*');
  md.push('');
  md.push('Most repeated primary reasons (truncated):');
  md.push('');
  md.push(recurringReasons || '*(n/a)*');

  await mkdir(join(API_ROOT, 'docs'), { recursive: true });
  await writeFile(REPORT_PATH, md.join('\n'), 'utf8');

  await app.close();

  const pairCount = (selected.length * (selected.length - 1)) / 2;
  console.log('');
  console.log('[match-audit-15] Done.');
  console.log(`  Profiles: ${selected.length} (reused analysis: ${reused}, LLM analyze: ${ranLlm}, V2 backfill only: ${v2Backfill})`);
  console.log(`  Pairs compared: ${pairRows.length} (expected ${pairCount})`);
  console.log(`  Report: ${REPORT_PATH}`);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
