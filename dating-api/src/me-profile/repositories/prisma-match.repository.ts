import { Injectable } from '@nestjs/common';
import {
  MatchActionType,
  MutualMatchStatus,
  Prisma,
  UserProfilePhotoStatus,
} from '@prisma/client';
import type { MatchListCursorPayload } from '../../cache/match-list-cache';
import { PrismaService } from '../../prisma/prisma.service';
import { MATCH_LIST_CANDIDATE_HYDRATE_ORDER_BY } from '../match-list-candidate-cap';
import {
  MATCH_LIST_RANK_PERSIST_CHUNK,
  MATCH_LIST_RANK_PERSIST_TX,
} from '../match-list-rank-persist.constants';
import { buildMatchCandidateSqlPrefilterWhere } from '../me-matches-candidate-sql-prefilter';
import { LATEST_EVAL_BATCH_SIZE } from '../me-profile-analysis.service';
import { matchListRankAfterCursorWhere } from '../matches/match-list-cursor';
import { STATUS_ANALYZED } from '../matches/match-list.helpers';
import type { IMatchRepository } from './match.repository';
import {
  CANDIDATE_SELECT_DETAIL,
  CANDIDATE_SELECT_LIST,
} from './match-candidate.selects';
import type {
  AboutTextRow,
  CandidatePhotoAccessRow,
  EvaluationRow,
  LatestEvaluationForMatchRow,
  MatchActionRow,
  MatchCandidateDetailRow,
  MatchCandidateListRow,
  MatchListCandidateFilter,
  MutualMatchDetectResult,
  MutualMatchRow,
  RankPageRow,
  RankPersistRow,
  ViewerMatchContext,
  ViewerWithPreference,
} from './match.repository.types';

type MatchPersistenceClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PrismaMatchRepository implements IMatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  findViewerMatchContextByUserId(
    userId: string,
  ): Promise<ViewerMatchContext | null> {
    return this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        preference: true,
        signals: {
          select: { signalKey: true, signalValue: true, evalVersion: true },
        },
        interests: {
          select: { tag: true, rank: true, evalVersion: true },
          orderBy: { rank: 'asc' },
        },
      },
    });
  }

  findViewerWithPreferenceByUserId(
    userId: string,
  ): Promise<ViewerWithPreference | null> {
    return this.prisma.userProfile.findUnique({
      where: { userId },
      include: { preference: true },
    });
  }

  findCandidateProfileForDetail(
    candidateProfileId: string,
  ): Promise<MatchCandidateDetailRow | null> {
    return this.prisma.userProfile.findUnique({
      where: { id: candidateProfileId },
      select: CANDIDATE_SELECT_DETAIL,
    });
  }

  findCandidateProfilesByIdsForList(
    ids: string[],
  ): Promise<MatchCandidateListRow[]> {
    return this.prisma.userProfile.findMany({
      where: { id: { in: ids }, status: 'ANALYZED' },
      select: CANDIDATE_SELECT_LIST,
    });
  }

  countAnalyzedCandidatesExcludingUser(viewerUserId: string): Promise<number> {
    return this.prisma.userProfile.count({
      where: this.matchCandidateBaseWhere(viewerUserId),
    });
  }

  countPhotoEligibleCandidates(
    filter: MatchListCandidateFilter,
  ): Promise<number> {
    return this.prisma.userProfile.count({
      where: this.matchCandidatePhotoEligibleWhere(filter),
    });
  }

  listPhotoEligibleCandidates(
    filter: MatchListCandidateFilter,
    take: number,
  ): Promise<MatchCandidateListRow[]> {
    return this.prisma.userProfile.findMany({
      where: this.matchCandidatePhotoEligibleWhere(filter),
      orderBy: MATCH_LIST_CANDIDATE_HYDRATE_ORDER_BY,
      take,
      select: CANDIDATE_SELECT_LIST,
    });
  }

  private matchCandidateBaseWhere(
    viewerUserId: string,
  ): Prisma.UserProfileWhereInput {
    return {
      userId: { not: viewerUserId },
      status: STATUS_ANALYZED,
      user: { deletedAt: null },
    };
  }

  private matchCandidatePhotoEligibleWhere(
    filter: MatchListCandidateFilter,
  ): Prisma.UserProfileWhereInput {
    return {
      ...this.matchCandidateBaseWhere(filter.viewerUserId),
      photos: { some: { status: UserProfilePhotoStatus.APPROVED } },
      ...buildMatchCandidateSqlPrefilterWhere({
        acceptedPartnerGenders: filter.acceptedPartnerGenders,
        preference: filter.preference,
        asOf: filter.asOf,
      }),
    };
  }

  findCandidateProfileForPhotoAccess(
    candidateProfileId: string,
  ): Promise<CandidatePhotoAccessRow | null> {
    return this.prisma.userProfile.findUnique({
      where: { id: candidateProfileId },
      select: {
        id: true,
        userId: true,
        status: true,
        birthDate: true,
        gender: true,
        desiredPartnerGenders: true,
        city: true,
        country: true,
        locationLabel: true,
        aboutMe: true,
        aboutPartner: true,
        aboutRelationship: true,
        preference: true,
        user: { select: { deletedAt: true } },
      },
    });
  }

  findAboutTextByProfileIds(ids: string[]): Promise<AboutTextRow[]> {
    return this.prisma.userProfile.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        aboutMe: true,
        aboutPartner: true,
        aboutRelationship: true,
      },
    });
  }

  countApprovedPhotosForProfile(profileId: string): Promise<number> {
    return this.prisma.userProfilePhoto.count({
      where: { profileId, status: UserProfilePhotoStatus.APPROVED },
    });
  }

  findApprovedPrimaryPhoto(
    profileId: string,
    photoId: string,
  ): Promise<{ mimeType: string; storageKey: string } | null> {
    return this.prisma.userProfilePhoto.findFirst({
      where: {
        id: photoId,
        profileId,
        status: UserProfilePhotoStatus.APPROVED,
        isPrimary: true,
      },
      select: { mimeType: true, storageKey: true },
    });
  }

  findLatestEvaluationForProfile(
    profileId: string,
  ): Promise<EvaluationRow | null> {
    return this.prisma.userProfileEvaluation.findFirst({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
  }

  async findLatestEvaluationsForProfileIds(
    profileIds: string[],
  ): Promise<Map<string, LatestEvaluationForMatchRow>> {
    const out = new Map<string, LatestEvaluationForMatchRow>();
    const unique = [...new Set(profileIds)];
    for (let i = 0; i < unique.length; i += LATEST_EVAL_BATCH_SIZE) {
      const chunk = unique.slice(i, i + LATEST_EVAL_BATCH_SIZE);
      const rows = await this.prisma.$queryRaw<
        Array<{
          profileId: string;
          evaluationJson: Prisma.JsonValue;
          createdAt: Date | string;
          version: string;
        }>
      >(Prisma.sql`
        SELECT DISTINCT ON ("profileId")
          "profileId", "evaluationJson", "createdAt", "version"
        FROM "UserProfileEvaluation"
        WHERE "profileId" IN (${Prisma.join(chunk)})
        ORDER BY "profileId", "createdAt" DESC
      `);
      for (const row of rows) {
        out.set(row.profileId, {
          profileId: row.profileId,
          evaluationJson: row.evaluationJson,
          createdAt:
            row.createdAt instanceof Date
              ? row.createdAt
              : new Date(row.createdAt),
          version: row.version,
        });
      }
    }
    return out;
  }

  findActionByActorTarget(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ action: MatchActionType } | null> {
    return this.prisma.matchAction.findUnique({
      where: { actorUserId_targetUserId: { actorUserId, targetUserId } },
      select: { action: true },
    });
  }

  findActionWithCreatedAt(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ action: MatchActionType; createdAt: Date } | null> {
    return this.prisma.matchAction.findUnique({
      where: { actorUserId_targetUserId: { actorUserId, targetUserId } },
      select: { action: true, createdAt: true },
    });
  }

  listActionsByActor(
    actorUserId: string,
  ): Promise<Array<{ targetUserId: string; action: MatchActionType }>> {
    return this.prisma.matchAction.findMany({
      where: { actorUserId },
      select: { targetUserId: true, action: true },
    });
  }

  listActionsByActorForTargets(
    actorUserId: string,
    targetUserIds: string[],
  ): Promise<Array<{ targetUserId: string; action: MatchActionType }>> {
    return this.prisma.matchAction.findMany({
      where: { actorUserId, targetUserId: { in: targetUserIds } },
      select: { targetUserId: true, action: true },
    });
  }

  async upsertActionAndDetectMutual(args: {
    actorUserId: string;
    targetUserId: string;
    targetProfileIdSnapshot: string;
    action: MatchActionType;
  }): Promise<{
    row: MatchActionRow;
    detectResult: MutualMatchDetectResult | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.matchAction.upsert({
        where: {
          actorUserId_targetUserId: {
            actorUserId: args.actorUserId,
            targetUserId: args.targetUserId,
          },
        },
        create: args,
        update: {
          action: args.action,
          targetProfileIdSnapshot: args.targetProfileIdSnapshot,
        },
      });
      const detectResult =
        args.action === MatchActionType.LIKE
          ? await this.detectAndCreateWithClient(
              args.actorUserId,
              args.targetUserId,
              tx,
            )
          : null;
      return { row, detectResult };
    });
  }

  async deleteActionByActorTarget(
    actorUserId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.prisma.matchAction.delete({
      where: { actorUserId_targetUserId: { actorUserId, targetUserId } },
    });
  }

  detectAndCreateMutualMatch(
    actorUserId: string,
    targetUserId: string,
  ): Promise<MutualMatchDetectResult | null> {
    return this.detectAndCreateWithClient(
      actorUserId,
      targetUserId,
      this.prisma,
    );
  }

  async listActiveMutualCounterpartUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.mutualMatch.findMany({
      where: {
        status: MutualMatchStatus.ACTIVE,
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      select: { userId1: true, userId2: true },
    });
    return rows.map((row) => (row.userId1 === userId ? row.userId2 : row.userId1));
  }

  findActiveMutualByUserPair(
    userIdA: string,
    userIdB: string,
  ): Promise<MutualMatchRow | null> {
    const [userId1, userId2] = this.sortUserPair(userIdA, userIdB);
    return this.prisma.mutualMatch.findFirst({
      where: { userId1, userId2, status: MutualMatchStatus.ACTIVE },
    });
  }

  async deleteAllRanksForViewer(viewerUserId: string): Promise<number> {
    const result = await this.prisma.matchListRank.deleteMany({
      where: { viewerUserId },
    });
    return result.count;
  }

  async replaceRankSnapshot(
    viewerUserId: string,
    rows: RankPersistRow[],
    builtAt: Date,
  ): Promise<{ rowsWritten: number; rowsDeleted: number }> {
    const ids = rows.map((row) => row.candidateProfileId);
    for (let i = 0; i < rows.length; i += MATCH_LIST_RANK_PERSIST_CHUNK) {
      const chunk = rows.slice(i, i + MATCH_LIST_RANK_PERSIST_CHUNK);
      await this.prisma.$transaction(async (tx) => {
        await Promise.all(
          chunk.map((row) =>
            tx.matchListRank.upsert({
              where: {
                viewerUserId_candidateProfileId: {
                  viewerUserId,
                  candidateProfileId: row.candidateProfileId,
                },
              },
              create: { viewerUserId, ...row, builtAt },
              update: {
                matchScore: row.matchScore,
                hardBlocked: row.hardBlocked,
                builtAt,
              },
            }),
          ),
        );
      }, MATCH_LIST_RANK_PERSIST_TX);
    }
    const deleted = await this.prisma.matchListRank.deleteMany({
      where: { viewerUserId, candidateProfileId: { notIn: ids } },
    });
    return { rowsWritten: rows.length, rowsDeleted: deleted.count };
  }

  fetchMatchListRankPage(
    viewerUserId: string,
    cursor: MatchListCursorPayload | null,
    take: number,
  ): Promise<RankPageRow[]> {
    return this.prisma.matchListRank.findMany({
      where: matchListRankAfterCursorWhere(viewerUserId, cursor),
      orderBy: [
        { hardBlocked: 'asc' },
        { matchScore: 'desc' },
        { candidateProfileId: 'asc' },
      ],
      take,
      select: {
        candidateProfileId: true,
        matchScore: true,
        hardBlocked: true,
      },
    });
  }

  countRanksForViewer(viewerUserId: string): Promise<number> {
    return this.prisma.matchListRank.count({ where: { viewerUserId } });
  }

  private sortUserPair(userA: string, userB: string): [string, string] {
    return userA < userB ? [userA, userB] : [userB, userA];
  }

  private async detectAndCreateWithClient(
    actorUserId: string,
    targetUserId: string,
    db: MatchPersistenceClient,
  ): Promise<MutualMatchDetectResult | null> {
    const reverse = await db.matchAction.findUnique({
      where: {
        actorUserId_targetUserId: {
          actorUserId: targetUserId,
          targetUserId: actorUserId,
        },
      },
      select: { action: true },
    });
    if (reverse?.action !== MatchActionType.LIKE) return null;

    const [userId1, userId2] = this.sortUserPair(actorUserId, targetUserId);
    const existing = await db.mutualMatch.findUnique({
      where: { userId1_userId2: { userId1, userId2 } },
    });
    if (existing) return { mutualMatch: existing, created: false };

    const mutualMatch = await db.mutualMatch.create({
      data: { userId1, userId2, status: MutualMatchStatus.ACTIVE },
    });
    return { mutualMatch, created: true };
  }
}
