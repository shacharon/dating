/**
 * Read-only match quality audit for operators (CLI). Uses the same V1 service path as
 * GET /api/v1/me/matches/:id — no alternate scoring or legacy candidate-list services.
 */

import type { MeMatchDetailDto, MeMatchesService } from './me-matches.service';
import { latestEvaluationForProfile } from './me-profile-analysis.service';
import { resolveMeMatchesEngineInputSourceMode } from './me-profile-engine.mapper';
import type { PrismaService } from '../prisma/prisma.service';

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
    ENGINE_READ_NORMALIZED: string;
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
}

export interface BuildMatchQualityAuditOptions {
  viewerUserId: string;
  candidateProfileId: string;
  meMatches: Pick<MeMatchesService, 'list' | 'getById'>;
  prisma: PrismaService;
  /** Mirrors `MeMatchesService` / `ENGINE_READ_NORMALIZED === '1'`. */
  engineReadNormalized: boolean;
  /** When false, skips `list()` (no rank / counts). */
  includeListContext: boolean;
}

/**
 * Builds a JSON-serializable audit report. Primary data from {@link MeMatchesService.getById};
 * engine input source uses the same normalized guard as {@link assembleEvaluationPayload}.
 */
export async function buildMatchQualityAuditJson(
  options: BuildMatchQualityAuditOptions,
): Promise<MatchQualityAuditReport> {
  const {
    viewerUserId,
    candidateProfileId,
    meMatches,
    prisma,
    engineReadNormalized,
    includeListContext,
  } = options;

  const detail = await meMatches.getById(viewerUserId, candidateProfileId);

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
      'match-quality-audit: viewer or candidate profile row missing after getById',
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

  const traits = detail.matchExplanationTraits?.map((t) => ({
    group: t.group,
    label: t.label,
    evidence: t.evidence,
    strength: t.strength,
  }));

  const report: MatchQualityAuditReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    env: {
      ENGINE_READ_NORMALIZED: engineReadNormalized ? '1' : '0',
    },
    viewer: {
      userId: viewerUserId,
      profileId: viewerRow.id,
    },
    candidate: {
      profileId: candidateProfileId,
    },
    engineInputSource: {
      viewer: resolveMeMatchesEngineInputSourceMode(
        viewerSignals,
        viewerInterests,
        engineReadNormalized,
        viewerVersion,
      ),
      candidate: resolveMeMatchesEngineInputSourceMode(
        candidateSignals,
        candidateInterests,
        engineReadNormalized,
        candidateVersion,
      ),
    },
    compare: {
      outcome: detail.matchScore !== null ? 'scored' : 'guard',
    },
    matchScore: detail.matchScore,
    profileAnalysisStale: detail.profileAnalysisStale,
    explainability: detail.explainability,
    recommendation: detail.recommendation,
    evaluationSummary: detail.evaluationSummary,
    listContext,
  };

  if (traits !== undefined && traits.length > 0) {
    report.matchExplanationTraits = traits;
  }

  return report;
}
