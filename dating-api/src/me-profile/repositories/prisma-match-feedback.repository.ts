import { Injectable } from '@nestjs/common';
import { MatchFeedbackSentiment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IMatchFeedbackRepository } from './match-feedback.repository';

@Injectable()
export class PrismaMatchFeedbackRepository implements IMatchFeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSentiment(
    userId: string,
    matchProfileId: string,
  ): Promise<'positive' | 'negative' | null> {
    const row = await this.prisma.matchFeedback.findUnique({
      where: {
        userId_matchProfileId: { userId, matchProfileId },
      },
      select: { sentiment: true },
    });
    if (!row) return null;
    return row.sentiment === MatchFeedbackSentiment.POSITIVE
      ? 'positive'
      : 'negative';
  }

  upsertSentiment(args: {
    userId: string;
    matchProfileId: string;
    sentiment: 'positive' | 'negative';
  }): Promise<{
    matchProfileId: string;
    sentiment: MatchFeedbackSentiment;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const sentiment =
      args.sentiment === 'positive'
        ? MatchFeedbackSentiment.POSITIVE
        : MatchFeedbackSentiment.NEGATIVE;
    return this.prisma.matchFeedback.upsert({
      where: {
        userId_matchProfileId: {
          userId: args.userId,
          matchProfileId: args.matchProfileId,
        },
      },
      create: {
        userId: args.userId,
        matchProfileId: args.matchProfileId,
        sentiment,
      },
      update: { sentiment },
      select: {
        matchProfileId: true,
        sentiment: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
