/**
 * Read-only match quality audit for operators (CLI). Uses the same V1 service path as
 * GET /api/v1/me/matches/:id — no alternate scoring or legacy candidate-list services.
 *
 * HG dealbreaker eligibility is computed even when getById 404s (hard-excluded candidates),
 * so operators can see evidence for silent exclusions (Sprint 17 Story 3).
 */

import { NotFoundException } from '@nestjs/common';
import type { MeMatchDetailDto, MeMatchesService } from './me-matches.service';
import { latestEvaluationForProfile } from './me-profile-analysis.service';
import {
  buildMeMatchesParticipantReadModel,
  resolveMeMatchesEngineInputSourceMode,
} from './me-profile-engine.mapper';
import type { PrismaService } from '../prisma/prisma.service';
import { evaluateHolyGrailPairDirections } from '../matches/holy-grail-pair-directions';
import { adaptHolyGrailEvaluationToLegacyDimensionMap } from '../holy-grail-matching/evaluation-to-legacy-dimension-map';
import { buildHolyGrailEligibilityAuditV1 } from '../holy-grail-matching/build-eligibility-audit';
import { extractDealbreakerSignalsFromFreeText } from '../holy-grail-matching/dealbreaker-signals-text.extract';
import type { HolyGrailDealbreakerAuditRow } from '../holy-grail-matching/eligibility-audit.types';

const signalsSelect = {
  select: { signalKey: true, signalValue: true, evalVersion: true },
} as const;

const interestsInclude = {
  select: { tag: true, rank: true, evalVersion: true },
  orderBy: { rank: 'asc' as const },
};

export interface MatchQualityAuditReport {
  schemaVersion: 1;
  generatedAt: string;
  env: {
    engineInputSource: 'normalized' | 'evaluationJson';
  };
  viewer: {
    userId: string;
    profileId: string;
  };
  candidate: {
    profileId: string;
  };
  engineInputSource: {
    viewer: ReturnType<typeof resolveMeMatchesEngineInputSourceMode>;
    candidate: ReturnType<typeof resolveMeMatchesEngineInputSourceMode>;
  };
  compare: {
    outcome: 'scored' | 'guard';
  };
  matchScore: number | null;
  profileAnalysisStale?: boolean;
  explainability: MeMatchDetailDto['explainability'];
  recommendation: MeMatchDetailDto['recommendation'];
  matchExplanationTraits?: Array<{
    group: string;
    label: string;
    evidence: string;
    strength: string;
  }>;
  evaluationSummary: MeMatchDetailDto['evaluationSummary'];
  listContext?:
    | {
        viewerProfileId: string;
        candidateRank: number | null;
        totalMatchesReturned: number;
      }
    | { skipped: true; reason: string }
    | { notReady: true; reason: string | undefined };
  /** Viewer→candidate HG hard eligibility + dealbreaker evidence (Sprint 17 Story 3). */
  holyGrailEligibility?: {
    overallHardEligibility: 'PASS' | 'FAIL';
    dealbreakerDimensions: HolyGrailDealbreakerAuditRow[];
  };
}

export interface BuildMatchQualityAuditOptions {
  viewerUserId: string;
  candidateProfileId: string;
  meMatches: Pick<MeMatchesService, 'list' | 'getById'>;
  prisma: PrismaService;
  /** When false, skips `list()` (no rank / counts). */
  includeListContext: boolean;
}

/**
 * Builds a JSON-serializable audit report.
 * Detail path uses {@link MeMatchesService.getById} when the candidate is list-visible;
 * hard-excluded pairs still return HG dealbreaker evidence (Story 3 AC).
 */
export async function buildMatchQualityAuditJson(
  options: BuildMatchQualityAuditOptions,
): Promise<MatchQualityAuditReport> {
  const {
    viewerUserId,
    candidateProfileId,
    meMatches,
    prisma,
    includeListContext,
  } = options;

  let detail: MeMatchDetailDto | null = null;
  try {
    detail = await meMatches.getById(viewerUserId, candidateProfileId);
  } catch (e) {
    if (!(e instanceof NotFoundException)) {
      throw e;
    }
    // Candidate hard-excluded (or otherwise not visible) — continue for HG audit.
  }

  const viewerRow = await prisma.userProfile.findUnique({
    where: { userId: viewerUserId },
    select: {
      id: true,
      signals: signalsSelect,
      interests: interestsInclude,
    },
  });

  const candidateRow = await prisma.userProfile.findUnique({
    where: { id: candidateProfileId },
    select: {
      id: true,
      signals: signalsSelect,
      interests: interestsInclude,
    },
  });

  if (!viewerRow || !candidateRow) {
    throw new Error(
      'match-quality-audit: viewer or candidate profile row missing',
    );
  }

  const viewerEval = await latestEvaluationForProfile(prisma, viewerRow.id);
  const candidateEval = await latestEvaluationForProfile(
    prisma,
    candidateRow.id,
  );

  const viewerVersion = viewerEval?.version ?? '';
  const candidateVersion = candidateEval?.version ?? '';

  const viewerSignals = viewerRow.signals ?? [];
  const viewerInterests = viewerRow.interests ?? [];
  const candidateSignals = candidateRow.signals ?? [];
  const candidateInterests = candidateRow.interests ?? [];

  let listContext: MatchQualityAuditReport['listContext'];
  if (!includeListContext) {
    listContext = { skipped: true, reason: '--skip-list' };
  } else {
    const list = await meMatches.list(viewerUserId);
    if (list.status !== 'ready') {
      listContext = { notReady: true, reason: list.reason };
    } else {
      const matches = list.matches ?? [];
      const idx = matches.findIndex((m) => m.id === candidateProfileId);
      listContext = {
        viewerProfileId: list.viewerProfileId ?? viewerRow.id,
        candidateRank: idx >= 0 ? idx + 1 : null,
        totalMatchesReturned: matches.length,
      };
    }
  }

  const traits = detail?.matchExplanationTraits?.map((t) => ({
    group: t.group,
    label: t.label,
    evidence: t.evidence,
    strength: t.strength,
  }));

  const viewerSourceMode = resolveMeMatchesEngineInputSourceMode(
    viewerSignals,
    viewerInterests,
    viewerVersion,
  );
  const candidateSourceMode = resolveMeMatchesEngineInputSourceMode(
    candidateSignals,
    candidateInterests,
    candidateVersion,
  );

  const report: MatchQualityAuditReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    env: {
      engineInputSource: viewerSourceMode === 'normalized' && candidateSourceMode === 'normalized'
        ? 'normalized'
        : 'evaluationJson',
    },
    viewer: {
      userId: viewerUserId,
      profileId: viewerRow.id,
    },
    candidate: {
      profileId: candidateProfileId,
    },
    engineInputSource: {
      viewer: viewerSourceMode,
      candidate: candidateSourceMode,
    },
    compare: {
      outcome:
        detail !== null && detail.matchScore !== null ? 'scored' : 'guard',
    },
    matchScore: detail?.matchScore ?? null,
    profileAnalysisStale: detail?.profileAnalysisStale,
    explainability: detail?.explainability ?? null,
    recommendation: detail?.recommendation ?? null,
    evaluationSummary: detail?.evaluationSummary ?? null,
    listContext,
  };

  if (traits !== undefined && traits.length > 0) {
    report.matchExplanationTraits = traits;
  }

  if (viewerEval && candidateEval) {
    const viewerFull = await prisma.userProfile.findUnique({
      where: { id: viewerRow.id },
      include: { preference: true },
    });
    const candidateFull = await prisma.userProfile.findUnique({
      where: { id: candidateRow.id },
      include: { preference: true },
    });
    if (viewerFull && candidateFull) {
      const { preference: viewerPref, ...viewerCore } = viewerFull;
      const { preference: candidatePref, ...candidateCore } = candidateFull;
      const viewerRead = buildMeMatchesParticipantReadModel(
        viewerCore,
        viewerPref ?? null,
        viewerEval,
        {
          signals: viewerSignals,
          interests: viewerInterests,
        },
      );
      const candidateRead = buildMeMatchesParticipantReadModel(
        candidateCore,
        candidatePref ?? null,
        candidateEval,
        {
          signals: candidateSignals,
          interests: candidateInterests,
        },
      );
      const hgDirections = evaluateHolyGrailPairDirections(
        viewerRead.hg.row,
        candidateRead.hg.row,
      );
      if (hgDirections !== null) {
        const hardSignals = extractDealbreakerSignalsFromFreeText({
          aboutMe: viewerFull.aboutMe,
          aboutPartner: viewerFull.aboutPartner,
          aboutRelationship: viewerFull.aboutRelationship,
        }).signals.filter(
          (s) =>
            s.classification === 'HARD_EXCLUDE' ||
            s.classification === 'HARD_REQUIRE',
        );
        const eligibilityAudit = buildHolyGrailEligibilityAuditV1({
          searcherProfileId: viewerRow.id,
          counterpartyProfileId: candidateRow.id,
          evaluatedAt: new Date(),
          dimensions: adaptHolyGrailEvaluationToLegacyDimensionMap(
            hgDirections.aToB,
          ),
          dealbreakerDimensions: hgDirections.aToB.dealbreakerDimensions,
          searcherHardSignals: hardSignals,
        });
        report.holyGrailEligibility = {
          overallHardEligibility: hgDirections.aToB.overallHardEligibility,
          dealbreakerDimensions: [
            ...(eligibilityAudit.dealbreakerDimensions ?? []),
          ],
        };
      }
    }
  }

  return report;
}
