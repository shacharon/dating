import type { MatchFeedbackSentiment } from '@prisma/client';

export const MATCH_FEEDBACK_REPOSITORY = Symbol('MATCH_FEEDBACK_REPOSITORY');

export interface IMatchFeedbackRepository {
  findSentiment(
    userId: string,
    matchProfileId: string,
  ): Promise<'positive' | 'negative' | null>;

  upsertSentiment(args: {
    userId: string;
    matchProfileId: string;
    sentiment: 'positive' | 'negative';
  }): Promise<{
    matchProfileId: string;
    sentiment: MatchFeedbackSentiment;
    createdAt: Date;
    updatedAt: Date;
  }>;
}
