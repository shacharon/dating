import { Inject, Injectable } from '@nestjs/common';
import type { MutualMatch } from '@prisma/client';
import {
  MATCH_REPOSITORY,
  type IMatchRepository,
} from './repositories/match.repository';
export type { MutualMatchDetectResult } from './repositories/match.repository.types';
import type { MutualMatchDetectResult } from './repositories/match.repository.types';

@Injectable()
export class MutualMatchesService {
  constructor(
    @Inject(MATCH_REPOSITORY) private readonly matches: IMatchRepository,
  ) {}

  sortUserPair(userA: string, userB: string): [string, string] {
    return userA < userB ? [userA, userB] : [userB, userA];
  }

  async detectAndCreateMutualMatch(
    actorUserId: string,
    targetUserId: string,
  ): Promise<MutualMatchDetectResult | null> {
    return this.matches.detectAndCreateMutualMatch(actorUserId, targetUserId);
  }

  async findActiveByUserPair(
    userA: string,
    userB: string,
  ): Promise<MutualMatch | null> {
    return this.matches.findActiveMutualByUserPair(userA, userB);
  }
}
