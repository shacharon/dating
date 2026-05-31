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
}

export interface MatchActionStateDto {
  action: MatchActionType | null;
  createdAt?: string;
}

export interface VisibleMatchCandidate {
  candidateProfileId: string;
  targetUserId: string;
}
