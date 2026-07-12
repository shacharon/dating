import { IsEnum } from 'class-validator';
import { MatchActionType } from '@prisma/client';

export class CreateMatchActionDto {
  @IsEnum(MatchActionType)
  action!: MatchActionType;
}

export interface MatchActionDto {
  id: string;
  actorUserId: string;
  targetUserId: string;
  targetProfileIdSnapshot: string;
  action: MatchActionType;
  createdAt: string;
  mutualMatch: boolean;
  conversationId: string | null;
}

export interface MatchActionStateDto {
  action: MatchActionType | null;
  createdAt?: string;
  mutualMatch: boolean;
  conversationId: string | null;
}

export interface VisibleMatchCandidate {
  candidateProfileId: string;
  targetUserId: string;
}
