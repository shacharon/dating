import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type ConversationStarterCacheKey = {
  viewerProfileId: string;
  candidateProfileId: string;
  viewerEvaluationId: string;
  candidateEvaluationId: string;
  promptVersion: string;
};

@Injectable()
export class ConversationStarterCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    args: ConversationStarterCacheKey,
  ): Promise<{ opener: string } | null> {
    const row = await this.prisma.conversationStarterCache.findUnique({
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
      select: { opener: true },
    });
    const opener = row?.opener?.trim();
    if (!opener) return null;
    return { opener };
  }

  async upsert(
    args: ConversationStarterCacheKey & {
      opener: string;
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
    await this.prisma.conversationStarterCache.upsert({
      where: {
        viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion:
          key,
      },
      create: {
        ...key,
        opener: args.opener,
        model: args.model ?? null,
      },
      update: {
        opener: args.opener,
        model: args.model ?? null,
      },
    });
  }
}
