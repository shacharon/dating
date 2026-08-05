import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildNarrativeTldr } from './match-narrative-tldr';

export type MatchNarrativeCacheEntry = {
  narrative: string;
  narrativeTldr: string | null;
};

export type MatchNarrativeCacheKey = {
  viewerProfileId: string;
  candidateProfileId: string;
  viewerEvaluationId: string;
  candidateEvaluationId: string;
  promptVersion: string;
};

@Injectable()
export class MatchNarrativeCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    args: MatchNarrativeCacheKey,
  ): Promise<MatchNarrativeCacheEntry | null> {
    const row = await this.prisma.matchNarrativeCache.findUnique({
      where: {
        viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion:
          {
            viewerProfileId: args.viewerProfileId,
            candidateProfileId: args.candidateProfileId,
            viewerEvaluationId: args.viewerEvaluationId,
            candidateEvaluationId: args.candidateEvaluationId,
            promptVersion: args.promptVersion,
          },
      },
      select: { narrative: true, narrativeTldr: true },
    });
    if (row == null || !row.narrative) return null;

    const existing = row.narrativeTldr?.trim() || null;
    if (existing) {
      return { narrative: row.narrative, narrativeTldr: existing };
    }

    const narrativeTldr = buildNarrativeTldr(row.narrative);
    if (narrativeTldr) {
      // Best-effort backfill for legacy rows — never fail the read path.
      void this.prisma.matchNarrativeCache
        .update({
          where: {
            viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion:
              {
                viewerProfileId: args.viewerProfileId,
                candidateProfileId: args.candidateProfileId,
                viewerEvaluationId: args.viewerEvaluationId,
                candidateEvaluationId: args.candidateEvaluationId,
                promptVersion: args.promptVersion,
              },
          },
          data: { narrativeTldr },
        })
        .catch(() => undefined);
    }

    return {
      narrative: row.narrative,
      narrativeTldr: narrativeTldr || null,
    };
  }

  async upsert(
    args: MatchNarrativeCacheKey & {
      narrative: string;
      narrativeTldr: string;
      model?: string | null;
    },
  ): Promise<void> {
    const key = {
      viewerProfileId: args.viewerProfileId,
      candidateProfileId: args.candidateProfileId,
      viewerEvaluationId: args.viewerEvaluationId,
      candidateEvaluationId: args.candidateEvaluationId,
      promptVersion: args.promptVersion,
    };
    await this.prisma.matchNarrativeCache.upsert({
      where: {
        viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion:
          key,
      },
      create: {
        ...key,
        narrative: args.narrative,
        narrativeTldr: args.narrativeTldr,
        model: args.model ?? null,
      },
      update: {
        narrative: args.narrative,
        narrativeTldr: args.narrativeTldr,
        model: args.model ?? null,
      },
    });
  }
}
