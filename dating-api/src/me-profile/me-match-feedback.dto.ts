import { IsIn } from 'class-validator';

export class UpsertMatchFeedbackDto {
  @IsIn(['positive', 'negative'])
  sentiment!: 'positive' | 'negative';
}

export interface MatchFeedbackStateDto {
  sentiment: 'POSITIVE' | 'NEGATIVE' | null;
}

export interface MatchFeedbackDto {
  matchProfileId: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  createdAt: string;
  updatedAt: string;
}
