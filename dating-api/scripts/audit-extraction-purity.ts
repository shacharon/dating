/**
 * Audit V1 extraction purity across pipeline stages (observational only).
 *
 * Run (from dating-api): npx ts-node --transpile-only -r tsconfig-paths/register scripts/audit-extraction-purity.ts
 *
 * Env: OPENAI / LLM config as for the app. Uses first N handmade profiles by default (no DB).
 * Optional: AUDIT_FROM_DB=1 to pull profiles from Prisma (same sample size).
 */

import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExtractionService } from '../src/extraction/extraction.service';
import type { ExtractedSignals } from '../src/extraction/extracted-signals.interface';
import type { ExtractionDomain } from '../src/extraction/extracted-signals.interface';
import {
  computeV1PipelineSnapshots,
  evidenceRowsDropped,
  explainEvidenceDrops,
  officialSignalDiffKeys,
  type EvidenceDropReason,
} from '../src/extraction/extraction-pipeline-snapshots';
import { HANDMADE_PROFILES } from './handmade-profiles.data';
import { PrismaService } from '../src/prisma/prisma.service';

const SAMPLE_SIZE = Math.min(
  15,
  Math.max(10, Number(process.env.AUDIT_SAMPLE_SIZE) || 12),
);

type StageLabel =
  | 'rawLlmOutput'
  | 'afterNormalize'
  | 'afterValidateClean'
  | 'afterValidateExtraction';

interface TransitionReport {
  from: StageLabel;
  to: StageLabel;
  signal_keys_changed: string[];
  signals_removed_or_changed: Array<{
    key: string;
    before: number | null;
    after: number | null;
  }>;
  evidence_dropped_count: number;
  evidence_drop_reasons: { reason: EvidenceDropReason; count: number }[];
}

interface StageSummary {
  non_null_signal_count: number;
  evidence_row_count: number;
}

interface EvidenceDiffSummary {
  /** Rows surviving after validateExtraction. */
  evidence_kept_final: number;
  /** Total dropped across all transitions (may count same logical row once per transition if re-added—here transitions are sequential, so sum of per-transition drops). */
  evidence_dropped_total_across_transitions: number;
}

interface DomainReport {
  domain: ExtractionDomain;
  stages_summary: {
    rawLlmOutput: StageSummary;
    afterNormalize: StageSummary;
    afterValidateClean: StageSummary;
    afterValidateExtraction: StageSummary;
  };
  evidence_diff: EvidenceDiffSummary;
  transitions: TransitionReport[];
  semantic_change: boolean;
  mutation_count: number;
}

interface ProfileReport {
  profileId: string;
  name: string;
  domains: DomainReport[];
  semantic_change: boolean;
  mutation_count: number;
}

function stageChain(s: ReturnType<typeof computeV1PipelineSnapshots>): [
  StageLabel,
  ExtractedSignals,
][] {
  return [
    ['rawLlmOutput', s.rawLlmOutput],
    ['afterNormalize', s.afterNormalize],
    ['afterValidateClean', s.afterValidateClean],
    ['afterValidateExtraction', s.afterValidateExtraction],
  ];
}

function buildTransitions(
  snaps: ReturnType<typeof computeV1PipelineSnapshots>,
  text: string,
  domain: ExtractionDomain,
): TransitionReport[] {
  const chain = stageChain(snaps);
  const out: TransitionReport[] = [];
  for (let i = 1; i < chain.length; i++) {
    const [fromL, fromE] = chain[i - 1];
    const [toL, toE] = chain[i];
    const keys = officialSignalDiffKeys(fromE.signals, toE.signals);
    const detail = keys.map((key) => ({
      key,
      before: fromE.signals[key] ?? null,
      after: toE.signals[key] ?? null,
    }));
    const dropped = evidenceRowsDropped(fromE.evidence, toE.evidence);
    out.push({
      from: fromL,
      to: toL,
      signal_keys_changed: keys,
      signals_removed_or_changed: detail,
      evidence_dropped_count: dropped.length,
      evidence_drop_reasons: explainEvidenceDrops(dropped, text, domain),
    });
  }
  return out;
}

function domainSemanticChange(snaps: ReturnType<typeof computeV1PipelineSnapshots>): boolean {
  const a = snaps.rawLlmOutput.signals;
  const b = snaps.afterValidateExtraction.signals;
  for (const k of officialSignalDiffKeys(a, b)) {
    if (a[k] !== b[k]) return true;
  }
  return false;
}

function domainMutationCount(
  snaps: ReturnType<typeof computeV1PipelineSnapshots>,
  text: string,
  domain: ExtractionDomain,
): number {
  const tr = buildTransitions(snaps, text, domain);
  let n = 0;
  for (const t of tr) {
    n += t.signal_keys_changed.length;
    n += t.evidence_dropped_count;
  }
  return n;
}

function stageSummary(e: ExtractedSignals): StageSummary {
  const non_null_signal_count = Object.values(e.signals).filter((v) => v != null).length;
  return {
    non_null_signal_count,
    evidence_row_count: e.evidence.length,
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const extraction = app.get(ExtractionService);
    const prisma = app.get(PrismaService);

    type Sample = {
      id: string;
      name: string;
      aboutMe: string;
      aboutPartner: string;
      aboutRelationship: string;
    };

    let samples: Sample[] = [];

    if (process.env.AUDIT_FROM_DB === '1') {
      const rows = await prisma.userProfile.findMany({
        take: SAMPLE_SIZE,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          aboutMe: true,
          aboutPartner: true,
          aboutRelationship: true,
        },
      });
      samples = rows.map((r) => ({
        id: r.id,
        name: r.name,
        aboutMe: r.aboutMe ?? '',
        aboutPartner: r.aboutPartner ?? '',
        aboutRelationship: r.aboutRelationship ?? '',
      }));
    } else {
      samples = HANDMADE_PROFILES.slice(0, SAMPLE_SIZE).map((p) => ({
        id: p.id,
        name: p.name,
        aboutMe: p.aboutMe,
        aboutPartner: p.aboutPartner,
        aboutRelationship: p.aboutRelationship,
      }));
    }

    if (samples.length === 0) {
      console.error('No profiles to audit.');
      process.exit(1);
    }

    const profiles: ProfileReport[] = [];
    const signalNullCounts = new Map<string, number>();
    const signalChangeCounts = new Map<string, number>();
    const evidenceReasonAgg = new Map<EvidenceDropReason, number>();

    for (const p of samples) {
      const domains: DomainReport[] = [];
      let pMut = 0;
      let pSem = false;

      const specs: Array<{ domain: ExtractionDomain; text: string }> = [
        { domain: 'self', text: p.aboutMe },
        { domain: 'partner', text: p.aboutPartner },
        { domain: 'relationship', text: p.aboutRelationship },
      ];

      for (const { domain, text } of specs) {
        const trimmed = text.trim();
        if (!trimmed) {
          domains.push({
            domain,
            stages_summary: {
              rawLlmOutput: { non_null_signal_count: 0, evidence_row_count: 0 },
              afterNormalize: { non_null_signal_count: 0, evidence_row_count: 0 },
              afterValidateClean: { non_null_signal_count: 0, evidence_row_count: 0 },
              afterValidateExtraction: { non_null_signal_count: 0, evidence_row_count: 0 },
            },
            evidence_diff: {
              evidence_kept_final: 0,
              evidence_dropped_total_across_transitions: 0,
            },
            transitions: [],
            semantic_change: false,
            mutation_count: 0,
          });
          continue;
        }

        const userPrompt = `Domain: ${domain}\nText:\n"""\n${trimmed}\n"""`;
        const llmOut = await (
          extraction as unknown as {
            runFirstLlmExtractionCall: (
              d: ExtractionDomain,
              up: string,
              rid: string,
              len: number,
            ) => Promise<{ value: Record<string, unknown>; rawText: string | null }>;
          }
        ).runFirstLlmExtractionCall(
          domain,
          userPrompt,
          randomUUID(),
          trimmed.length,
        );

        const snaps = computeV1PipelineSnapshots(llmOut.value, domain, trimmed);
        const transitions = buildTransitions(snaps, trimmed, domain);
        const sem = domainSemanticChange(snaps);
        const mut = domainMutationCount(snaps, trimmed, domain);

        if (sem) pSem = true;
        pMut += mut;

        const a0 = snaps.rawLlmOutput.signals;
        const a3 = snaps.afterValidateExtraction.signals;
        for (const k of officialSignalDiffKeys(a0, a3)) {
          if (a0[k] !== a3[k]) {
            signalChangeCounts.set(k, (signalChangeCounts.get(k) ?? 0) + 1);
          }
          if (a0[k] != null && a3[k] === null) {
            signalNullCounts.set(k, (signalNullCounts.get(k) ?? 0) + 1);
          }
        }

        for (const t of transitions) {
          for (const r of t.evidence_drop_reasons) {
            evidenceReasonAgg.set(
              r.reason,
              (evidenceReasonAgg.get(r.reason) ?? 0) + r.count,
            );
          }
        }

        const evidenceDroppedSum = transitions.reduce(
          (s, t) => s + t.evidence_dropped_count,
          0,
        );

        domains.push({
          domain,
          stages_summary: {
            rawLlmOutput: stageSummary(snaps.rawLlmOutput),
            afterNormalize: stageSummary(snaps.afterNormalize),
            afterValidateClean: stageSummary(snaps.afterValidateClean),
            afterValidateExtraction: stageSummary(snaps.afterValidateExtraction),
          },
          evidence_diff: {
            evidence_kept_final: snaps.afterValidateExtraction.evidence.length,
            evidence_dropped_total_across_transitions: evidenceDroppedSum,
          },
          transitions,
          semantic_change: sem,
          mutation_count: mut,
        });
      }

      profiles.push({
        profileId: p.id,
        name: p.name,
        domains,
        semantic_change: pSem,
        mutation_count: pMut,
      });
    }

    const withSem = profiles.filter((x) => x.semantic_change).length;
    const avgMut =
      profiles.reduce((s, x) => s + x.mutation_count, 0) / profiles.length;

    const topNullified = [...signalNullCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({ key, nullified_count: count }));

    const topChanged = [...signalChangeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({ key, value_changed_count: count }));

    const topReasons = [...evidenceReasonAgg.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count }));

    const report = {
      meta: {
        sample_size: profiles.length,
        source: process.env.AUDIT_FROM_DB === '1' ? 'prisma' : 'handmade_profiles',
        note:
          'rawLlmOutput = normalizeRawExtraction(LLM JSON), first structured parse after the model returns. LLM calls use the same private prompt path as ExtractionService; post-LLM stages are replayed via computeV1PipelineSnapshots (mirrors production, no behavior change).',
      },
      summary: {
        profiles_with_semantic_change_pct: Math.round(
          (100 * withSem) / profiles.length,
        ),
        avg_mutation_count: Math.round(avgMut * 10) / 10,
        top_5_signals_nullified_end_to_end: topNullified,
        top_5_signals_value_changed_end_to_end: topChanged,
        evidence_drop_reasons_ranked: topReasons,
      },
      profiles,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
