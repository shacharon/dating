import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MatchNarrativeCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async find(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    promptVersion: string;
  }): Promise<string | null> {
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
      select: { narrative: true },
    });
    return row?.narrative ?? null;
  }

  async upsert(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    promptVersion: string;
    narrative: string;
    model?: string | null;
  }): Promise<void> {
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
        model: args.model ?? null,
      },
      update: {
        narrative: args.narrative,
        model: args.model ?? null,
      },
    });
  }
}
