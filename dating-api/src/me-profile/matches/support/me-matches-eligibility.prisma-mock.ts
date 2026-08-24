/** Test support only ΓÇö excluded from Nest dist via tsconfig.build. */

import { makeBaseProfileRow } from './me-matches-eligibility.builders';
import type { HarnessIdentity, HarnessPhotoRow } from './me-matches-eligibility.fixtures';
import type { createMatchNarrativeCachePrismaMock } from './match-narrative-test-stubs';

export type EligibilityHarnessHost = {
  readonly profiles: Map<string, Record<string, unknown>>;
  readonly evaluations: Map<string, Record<string, unknown>>;
  readonly preferences: Map<string, Record<string, unknown>>;
  readonly photosByProfileId: Map<string, HarnessPhotoRow[]>;
  readonly sessionMap: Map<string, { userId: string; hash: string }>;
  readonly matchActions: Map<string, Record<string, unknown>>;
  readonly mutualMatches: Map<string, Record<string, unknown>>;
  readonly matchListRanks: Map<
    string,
    {
      viewerUserId: string;
      candidateProfileId: string;
      matchScore: number;
      hardBlocked: boolean;
      builtAt: Date;
    }
  >;
  readonly narrativeCachePrisma: ReturnType<typeof createMatchNarrativeCachePrismaMock>;
  filterMatchListRanks(where?: {
    viewerUserId?: string;
    candidateProfileId?: string | { notIn?: string[] };
    hardBlocked?: boolean;
    matchScore?: number | { lt?: number };
    OR?: Array<Record<string, unknown>>;
  }): Array<{
    viewerUserId: string;
    candidateProfileId: string;
    matchScore: number;
    hardBlocked: boolean;
    builtAt: Date;
  }>;
  attachRelations(row: Record<string, unknown> | null): Record<string, unknown> | null;
  profileHasPhotoStatus(profileId: string, status: string | undefined): boolean;
  profileIdForUserId(userId: string): string;
  matchListRankKey(viewerUserId: string, candidateProfileId: string): string;
};

export function buildEligibilityPrismaMock(host: EligibilityHarnessHost) {
  // Self-referential: $transaction passes this mock as the tx client.
  // eslint-disable-next-line prefer-const
  let prismaMock: Record<string, unknown>;
  prismaMock = {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prismaMock),
    ),
    $queryRaw: jest.fn(async (sql: { values: unknown[] }) => {
      const rows: Array<{
        profileId: string;
        evaluationJson: unknown;
        createdAt: unknown;
        version: unknown;
      }> = [];
      for (const profileId of sql.values as string[]) {
        const row = host.evaluations.get(profileId);
        if (row !== undefined) {
          rows.push({
            profileId: row['profileId'] as string,
            evaluationJson: row['evaluationJson'],
            createdAt: row['createdAt'],
            version: row['version'],
          });
        }
      }
      return rows;
    }),
    matchNarrativeCache: host.narrativeCachePrisma.matchNarrativeCache,
    matchListRank: {
      findMany: jest.fn(
        async ({
          where,
          orderBy,
          take,
          select,
        }: {
          where?: {
            viewerUserId?: string;
            OR?: Array<Record<string, unknown>>;
          };
          orderBy?: Array<Record<string, 'asc' | 'desc'>>;
          take?: number;
          select?: Record<string, boolean>;
        } = {}) => {
          let rows = host.filterMatchListRanks(where);
          if (orderBy?.length) {
            rows = [...rows].sort((a, b) => {
              for (const clause of orderBy) {
                const key = Object.keys(clause)[0] as
                  | 'hardBlocked'
                  | 'matchScore'
                  | 'candidateProfileId';
                const dir = clause[key];
                const av = a[key];
                const bv = b[key];
                if (av === bv) continue;
                if (typeof av === 'boolean' && typeof bv === 'boolean') {
                  const cmp = Number(av) - Number(bv);
                  return dir === 'desc' ? -cmp : cmp;
                }
                if (typeof av === 'number' && typeof bv === 'number') {
                  return dir === 'desc' ? bv - av : av - bv;
                }
                const cmp = String(av) < String(bv) ? -1 : 1;
                return dir === 'desc' ? -cmp : cmp;
              }
              return 0;
            });
          }
          if (take !== undefined) rows = rows.slice(0, take);
          if (!select) return rows;
          return rows.map((r) => {
            const out: Record<string, unknown> = {};
            for (const [k, on] of Object.entries(select)) {
              if (on) out[k] = r[k as keyof typeof r];
            }
            return out;
          });
        },
      ),
      count: jest.fn(async ({ where }: { where?: { viewerUserId?: string } } = {}) => {
        return host.filterMatchListRanks(where).length;
      }),
      deleteMany: jest.fn(
        async ({
          where,
        }: {
          where?: {
            viewerUserId?: string;
            candidateProfileId?: string | { notIn?: string[] };
          };
        } = {}) => {
          const toDelete = host.filterMatchListRanks(where);
          for (const row of toDelete) {
            host.matchListRanks.delete(
              host.matchListRankKey(row.viewerUserId, row.candidateProfileId),
            );
          }
          return { count: toDelete.length };
        },
      ),
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: {
            viewerUserId_candidateProfileId: {
              viewerUserId: string;
              candidateProfileId: string;
            };
          };
          create: {
            viewerUserId: string;
            candidateProfileId: string;
            matchScore: number;
            hardBlocked: boolean;
            builtAt: Date;
          };
          update: {
            matchScore: number;
            hardBlocked: boolean;
            builtAt: Date;
          };
        }) => {
          const { viewerUserId, candidateProfileId } =
            where.viewerUserId_candidateProfileId;
          const key = host.matchListRankKey(viewerUserId, candidateProfileId);
          const existing = host.matchListRanks.get(key);
          if (existing) {
            const next = {
              ...existing,
              matchScore: update.matchScore,
              hardBlocked: update.hardBlocked,
              builtAt: update.builtAt,
            };
            host.matchListRanks.set(key, next);
            return next;
          }
          const created = { ...create };
          host.matchListRanks.set(key, created);
          return created;
        },
      ),
      createMany: jest.fn(
        async ({
          data,
        }: {
          data: Array<{
            viewerUserId: string;
            candidateProfileId: string;
            matchScore: number;
            hardBlocked: boolean;
            builtAt?: Date;
          }>;
        }) => {
          let count = 0;
          for (const row of data) {
            const key = host.matchListRankKey(
              row.viewerUserId,
              row.candidateProfileId,
            );
            if (host.matchListRanks.has(key)) continue;
            host.matchListRanks.set(key, {
              viewerUserId: row.viewerUserId,
              candidateProfileId: row.candidateProfileId,
              matchScore: row.matchScore,
              hardBlocked: row.hardBlocked,
              builtAt: row.builtAt ?? new Date(),
            });
            count += 1;
          }
          return { count };
        },
      ),
    },
    userSession: {
      create: jest.fn(async ({ data }: { data: { expiresAt: Date } }) => ({
        id: `sess_${Date.now()}_${Math.random()}`,
        expiresAt: data.expiresAt,
      })),
      findUnique: jest.fn(
        async ({ where }: { where: { sessionTokenHash: string } }) => {
          for (const [userId, sess] of host.sessionMap) {
            if (sess.hash === where.sessionTokenHash) {
              return {
                id: `sess_row_${userId}`,
                userId,
                sessionTokenHash: sess.hash,
                expiresAt: new Date('2038-01-01T00:00:00.000Z'),
                revokedAt: null,
              };
            }
          }
          return null;
        },
      ),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt_eligibility' }),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    userProfile: {
      findUnique: jest.fn(
        async ({ where }: { where: { userId?: string; id?: string } }) => {
          let row: Record<string, unknown> | null = null;
          if (where.userId !== undefined) {
            row = host.profiles.get(host.profileIdForUserId(where.userId)) ?? null;
          } else if (where.id !== undefined) {
            row = host.profiles.get(where.id) ?? null;
          }
          return host.attachRelations(row);
        },
      ),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(
        async ({
          where,
        }: {
          where?: {
            userId?: { not?: string };
            status?: string;
            gender?: { in?: string[] };
            birthDate?: {
              not?: null;
              gte?: Date;
              lte?: Date;
            };
            photos?: { some?: { status?: string } };
            user?: { deletedAt?: null };
          };
        } = {}) => {
          const rows = [...host.profiles.values()];
          return rows
            .filter((p) => {
              if (where?.userId?.not && p['userId'] === where.userId.not) return false;
              if (where?.status && p['status'] !== where.status) return false;
              if (where?.photos?.some) {
                const requiredStatus = where.photos.some.status;
                if (
                  !host.profileHasPhotoStatus(p['id'] as string, requiredStatus)
                ) {
                  return false;
                }
              }
              if (where?.gender?.in) {
                const allowed = new Set(where.gender.in);
                if (!allowed.has(p['gender'] as string)) return false;
              }
              if (where?.birthDate) {
                const bd = p['birthDate'] as Date | null | undefined;
                if (where.birthDate.not === null && (bd == null)) return false;
                if (bd != null) {
                  const t = bd instanceof Date ? bd.getTime() : new Date(bd).getTime();
                  if (where.birthDate.gte && t < where.birthDate.gte.getTime()) {
                    return false;
                  }
                  if (where.birthDate.lte && t > where.birthDate.lte.getTime()) {
                    return false;
                  }
                }
              }
              return true;
            })
            .map((p) => host.attachRelations(p)!);
        },
      ),
      count: jest.fn(
        async ({
          where,
        }: {
          where?: {
            userId?: { not?: string };
            status?: string;
            gender?: { in?: string[] };
            birthDate?: {
              not?: null;
              gte?: Date;
              lte?: Date;
            };
            photos?: { some?: { status?: string } };
          };
        } = {}) => {
          const rows = [...host.profiles.values()];
          return rows.filter((p) => {
            if (where?.userId?.not && p['userId'] === where.userId.not) return false;
            if (where?.status && p['status'] !== where.status) return false;
            if (where?.photos?.some) {
              const requiredStatus = where.photos.some.status;
              if (
                !host.profileHasPhotoStatus(p['id'] as string, requiredStatus)
              ) {
                return false;
              }
            }
            if (where?.gender?.in) {
              const allowed = new Set(where.gender.in);
              if (!allowed.has(p['gender'] as string)) return false;
            }
            if (where?.birthDate) {
              const bd = p['birthDate'] as Date | null | undefined;
              if (where.birthDate.not === null && bd == null) return false;
              if (bd != null) {
                const t =
                  bd instanceof Date ? bd.getTime() : new Date(bd).getTime();
                if (where.birthDate.gte && t < where.birthDate.gte.getTime()) {
                  return false;
                }
                if (where.birthDate.lte && t > where.birthDate.lte.getTime()) {
                  return false;
                }
              }
            }
            return true;
          }).length;
        },
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: Record<string, unknown> & { user?: { connect?: { id?: string } } };
        }) => {
          const userId = data.user?.connect?.id as string;
          const id = host.profileIdForUserId(userId);
          const { user: _user, ...rest } = data;
          const row: Record<string, unknown> = {
            ...makeBaseProfileRow(id, userId),
            ...rest,
          };
          host.profiles.set(id, row);
          // Baseline E2E never uploaded photos; production submit/matches require
          // ΓëÑ1 APPROVED. Seed one so createΓåÆsubmitΓåÆmarkAnalyzed stays green.
          if ((host.photosByProfileId.get(id) ?? []).length === 0) {
            host.photosByProfileId.set(id, [
              {
                id: `photo_${id}_0`,
                profileId: id,
                status: 'APPROVED',
                isPrimary: true,
                storageKey: `uploads/${id}/0.jpg`,
                mimeType: 'image/jpeg',
              },
            ]);
          }
          return row;
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { userId?: string; id?: string };
          data: Record<string, unknown>;
        }) => {
          const id = where.id ?? host.profileIdForUserId(where.userId as string);
          const state = host.profiles.get(id);
          if (!state) throw new Error(`Harness: no profile to update for id=${id}`);
          const updated = { ...state, ...data, updatedAt: new Date() };
          host.profiles.set(id, updated);
          return updated;
        },
      ),
    },
    userProfilePreference: {
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { profileId: string };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const { profileId } = where;
          const existing = host.preferences.get(profileId);
          const merged = existing
            ? { ...existing, ...update, updatedAt: new Date() }
            : {
                id: `pref_${profileId}`,
                profileId,
                partnerAgeMin: null,
                partnerAgeMax: null,
                maxDistanceKm: null,
                acceptedPartnerGenders: [] as string[],
                updatedAt: new Date(),
                ...create,
              };
          host.preferences.set(profileId, merged);
          return merged;
        },
      ),
    },
    userProfileEvaluation: {
      findFirst: jest.fn(async ({ where }: { where: { profileId: string } }) =>
        host.evaluations.get(where.profileId) ?? null,
      ),
      findMany: jest.fn(
        async ({ where }: { where?: { profileId?: { in?: string[] } } } = {}) => {
          const ids = where?.profileId?.in ?? [];
          return ids
            .map((id) => host.evaluations.get(id))
            .filter((row): row is Record<string, unknown> => row !== undefined);
        },
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: { profileId: string; version: string; evaluationJson: unknown };
        }) => {
          const row = {
            id: `eval_${data.profileId}`,
            profileId: data.profileId,
            version: data.version,
            evaluationJson: data.evaluationJson,
            createdAt: new Date(),
          };
          host.evaluations.set(data.profileId, row);
          return row;
        },
      ),
    },
    matchAction: {
      findMany: jest.fn(
        async ({
          where,
        }: {
          where?: { actorUserId?: string };
        } = {}) => {
          const rows = [...host.matchActions.values()];
          if (where?.actorUserId === undefined) return rows;
          return rows.filter((r) => r['actorUserId'] === where.actorUserId);
        },
      ),
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: {
            actorUserId_targetUserId: {
              actorUserId: string;
              targetUserId: string;
            };
          };
        }) => {
          const { actorUserId, targetUserId } = where.actorUserId_targetUserId;
          return (
            host.matchActions.get(`${actorUserId}:${targetUserId}`) ?? null
          );
        },
      ),
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: {
            actorUserId_targetUserId: {
              actorUserId: string;
              targetUserId: string;
            };
          };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const { actorUserId, targetUserId } = where.actorUserId_targetUserId;
          const key = `${actorUserId}:${targetUserId}`;
          const existing = host.matchActions.get(key);
          if (existing) {
            const merged = { ...existing, ...update };
            host.matchActions.set(key, merged);
            return merged;
          }
          const row = {
            id: `ma_${actorUserId}_${targetUserId}`,
            createdAt: new Date(),
            ...create,
          };
          host.matchActions.set(key, row);
          return row;
        },
      ),
      delete: jest.fn(
        async ({
          where,
        }: {
          where: {
            actorUserId_targetUserId: {
              actorUserId: string;
              targetUserId: string;
            };
          };
        }) => {
          const { actorUserId, targetUserId } = where.actorUserId_targetUserId;
          const key = `${actorUserId}:${targetUserId}`;
          const existing = host.matchActions.get(key);
          host.matchActions.delete(key);
          return existing ?? {};
        },
      ),
    },
    mutualMatch: {
      findMany: jest.fn(
        async ({
          where,
        }: {
          where?: {
            status?: string;
            OR?: Array<{ userId1?: string; userId2?: string }>;
          };
        } = {}) => {
          let rows = [...host.mutualMatches.values()];
          if (where?.status) {
            rows = rows.filter((r) => r['status'] === where.status);
          }
          if (where?.OR && where.OR.length > 0) {
            rows = rows.filter((r) =>
              where.OR!.some(
                (clause) =>
                  (clause.userId1 !== undefined &&
                    r['userId1'] === clause.userId1) ||
                  (clause.userId2 !== undefined &&
                    r['userId2'] === clause.userId2),
              ),
            );
          }
          return rows;
        },
      ),
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: { userId1_userId2: { userId1: string; userId2: string } };
        }) => {
          const { userId1, userId2 } = where.userId1_userId2;
          return host.mutualMatches.get(`${userId1}:${userId2}`) ?? null;
        },
      ),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where?: {
            userId1?: string;
            userId2?: string;
            status?: string;
          };
        } = {}) => {
          for (const row of host.mutualMatches.values()) {
            if (
              where?.userId1 !== undefined &&
              row['userId1'] !== where.userId1
            ) {
              continue;
            }
            if (
              where?.userId2 !== undefined &&
              row['userId2'] !== where.userId2
            ) {
              continue;
            }
            if (where?.status !== undefined && row['status'] !== where.status) {
              continue;
            }
            return row;
          }
          return null;
        },
      ),
      create: jest.fn(
        async ({ data }: { data: Record<string, unknown> }) => {
          const userId1 = data['userId1'] as string;
          const userId2 = data['userId2'] as string;
          const row = {
            id: `mm_${userId1}_${userId2}`,
            status: 'ACTIVE',
            createdAt: new Date(),
            ...data,
          };
          host.mutualMatches.set(`${userId1}:${userId2}`, row);
          return row;
        },
      ),
    },
    userProfilePhoto: {
      count: jest.fn(
        async ({
          where,
        }: {
          where?: { profileId?: string; status?: string };
        } = {}) => {
          let rows = [...host.photosByProfileId.values()].flat();
          if (where?.profileId) {
            rows = rows.filter((p) => p.profileId === where.profileId);
          }
          if (where?.status) {
            rows = rows.filter((p) => p.status === where.status);
          }
          return rows.length;
        },
      ),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where?: {
            id?: string;
            profileId?: string;
            status?: string;
            isPrimary?: boolean;
          };
        } = {}) => {
          let rows = [...host.photosByProfileId.values()].flat();
          if (where?.id) rows = rows.filter((p) => p.id === where.id);
          if (where?.profileId) {
            rows = rows.filter((p) => p.profileId === where.profileId);
          }
          if (where?.status) {
            rows = rows.filter((p) => p.status === where.status);
          }
          if (where?.isPrimary !== undefined) {
            rows = rows.filter((p) => p.isPrimary === where.isPrimary);
          }
          return rows[0] ?? null;
        },
      ),
      findMany: jest.fn(
        async ({
          where,
        }: {
          where?: { profileId?: string; status?: string | { in?: string[] } };
        } = {}) => {
          let rows = [...host.photosByProfileId.values()].flat();
          if (where?.profileId) {
            rows = rows.filter((p) => p.profileId === where.profileId);
          }
          if (typeof where?.status === 'string') {
            rows = rows.filter((p) => p.status === where.status);
          } else if (where?.status && typeof where.status === 'object' && where.status.in) {
            const allowed = new Set(where.status.in);
            rows = rows.filter((p) => allowed.has(p.status));
          }
          return rows;
        },
      ),
    },
  };
  return prismaMock;
}
