/**
 * Shared boot/state harness for the Sprint 16/17 eligibility + ranking regression specs
 * (`me-new-model-e2e-eligibility.integration.spec.ts`, `me-new-model-e2e-ranking.integration.spec.ts`).
 *
 * Test support only (`*.spec-support.ts`) — excluded from Nest `dist/` via tsconfig.build.
 *
 * Mirrors the exact pattern established by `me-new-model-e2e.integration.spec.ts`:
 *  - Real Nest app boot (`Test.createTestingModule` + `app.init()`), real HTTP via supertest.
 *  - `PrismaService` replaced by a hand-rolled in-memory mock (plain JS `Map`s simulate DB rows —
 *    no real Postgres). Generalized here to N profiles (keyed by profile id) instead of the
 *    fixed two-user A/B shape, so multi-candidate ranking scenarios can reuse it too.
 *  - `MeProfileAnalysisService` stubbed; profile state is manually advanced to `ANALYZED` with a
 *    fixture `evaluationJson` via {@link EligibilityTestHarness.markAnalyzed}, simulating the
 *    async analysis worker completing.
 *  - `MeProfileValidationPipe` overridden as a pass-through (same as the reference spec) — DTO
 *    validation itself is covered elsewhere (`me-profile-http.integration.spec.ts`); these specs
 *    care about eligibility/ranking behavior, not input validation.
 *
 * IMPORTANT: partner preferences (`partnerAgeMin`/`partnerAgeMax`/`desiredPartnerGenders`) are set
 * through the **real** HTTP `POST`/`PATCH /api/v1/me/profile` path, exactly like a real client would
 * — never poked directly into the mock. `MeProfileService.upsertPreference` dual-writes those onto
 * `UserProfilePreference` inside the same transaction as the profile write; this harness's
 * `userProfilePreference.upsert` mock persists that state so later `GET /api/v1/me/matches` calls
 * read it back exactly as production would via `include: { preference: true }`.
 */

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserStatus } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { GoogleAuthService } from '../auth/google-auth.service';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { LLM_CONFIG } from '../llm/llm.constants';
import { requestCorrelationMiddleware } from '../logging/request-correlation.middleware';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { hashSessionToken } from '../session/session-token.crypto';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { MatchNarrativeGenerator } from '../matches/match-narrative';
import { CONTENT_MODERATION } from '../content-moderation/content-moderation.ports';
import { ContentViolationService } from '../content-moderation/content-violation.service';
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import {
  createMatchNarrativeCachePrismaMock,
  createMatchNarrativeGeneratorStub,
} from './match-narrative-test-stubs';
import { MeProfileModule } from './me-profile.module';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';

export const PEPPER = 'e2e-eligibility-test-pepper';
export const SESSION_COOKIE = 'dating_session';

export const configStub = {
  googleClientId: 'google-client-id',
  sessionSecretPepper: PEPPER,
  sessionCookieName: SESSION_COOKIE,
  sessionTtlDays: 14,
  cookieDomain: undefined as string | undefined,
  cookieSecure: false,
  corsOrigin: 'http://localhost:3000',
};

/** Minimal evaluation JSON that passes the engine's hasNumericSelfSignals check. */
export function makeEvalJson(
  signals: Record<string, number>,
  summary = 'Thoughtful and grounded.',
) {
  return {
    self: { signals },
    partner: { signals: {} },
    relationship: { signals: {} },
    display: { summary },
  };
}

export const DEFAULT_SELF_SIGNALS = {
  ambition: 0.6,
  socialBattery: 0.5,
  emotionalDepth: 0.7,
  attachmentSecurity: 0.6,
};

export const VALID_EVAL_JSON = makeEvalJson(DEFAULT_SELF_SIGNALS);

export interface HarnessIdentity {
  readonly id: string;
  readonly googleId: string;
  readonly email: string;
  readonly displayName: string;
}

/** Deterministic identity for a given short test-local key (e.g. "g1-searcher"). */
export function makeIdentity(key: string): HarnessIdentity {
  return {
    id: `user_${key}`,
    googleId: `g-${key}`,
    email: `${key}@elig.test`,
    displayName: `User ${key}`,
  };
}

function extractCookieValue(
  headers: Record<string, unknown>,
  name: string,
): string | undefined {
  const setCookie = headers['set-cookie'];
  if (!Array.isArray(setCookie)) return undefined;
  for (const line of setCookie) {
    if (typeof line === 'string' && line.startsWith(`${name}=`)) {
      return line.split(';')[0].slice(name.length + 1);
    }
  }
  return undefined;
}

function makeBaseProfileRow(id: string, userId: string): Record<string, unknown> {
  return {
    id,
    userId,
    name: '',
    nickname: null,
    status: 'DRAFT',
    onboardingStep: 'BASIC',
    aboutMe: null,
    aboutPartner: null,
    aboutRelationship: null,
    birthDate: null,
    gender: null,
    desiredPartnerGenders: null,
    city: null,
    country: null,
    locationLabel: null,
    submittedAt: null,
    analyzedAt: null,
    lastAnalysisError: null,
    childrenStatus: null,
    wantsChildren: null,
    smokingFrequency: null,
    alcoholUse: null,
    education: null,
    religion: null,
    _count: { evaluations: 0 },
    createdAt: new Date('2026-04-18T10:00:00.000Z'),
    updatedAt: new Date('2026-04-18T10:00:00.000Z'),
  };
}

export type HarnessPhotoStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED_FOR_REVIEW';

export type HarnessPhotoRow = {
  id: string;
  profileId: string;
  status: HarnessPhotoStatus;
  isPrimary: boolean;
  storageKey: string;
  mimeType: string;
};

/**
 * Generalized (N-profile) in-memory Prisma-backed test harness for real HTTP flows through
 * signup → profile create/patch → submit → simulate ANALYZED → GET /api/v1/me/matches.
 */
export class EligibilityTestHarness {
  app!: INestApplication<App>;

  private readonly profiles = new Map<string, Record<string, unknown>>();
  private readonly evaluations = new Map<string, Record<string, unknown>>();
  private readonly preferences = new Map<string, Record<string, unknown>>();
  /** Profile photos keyed by profile id (Sprint 19 Story 2 visibility). */
  private readonly photosByProfileId = new Map<string, HarnessPhotoRow[]>();
  private readonly sessionMap = new Map<string, { userId: string; hash: string }>();
  private readonly identitiesByGoogleId = new Map<string, HarnessIdentity>();
  private readonly identitiesById = new Map<string, HarnessIdentity>();
  /** Key: `${actorUserId}:${targetUserId}` */
  private readonly matchActions = new Map<string, Record<string, unknown>>();
  /** Key: `${userId1}:${userId2}` (sorted pair) */
  private readonly mutualMatches = new Map<string, Record<string, unknown>>();
  /** Key: `${viewerUserId}:${candidateProfileId}` — Sprint 46 / 38.3 materialized list. */
  private readonly matchListRanks = new Map<
    string,
    {
      viewerUserId: string;
      candidateProfileId: string;
      matchScore: number;
      hardBlocked: boolean;
      builtAt: Date;
    }
  >();

  private matchListRankKey(viewerUserId: string, candidateProfileId: string): string {
    return `${viewerUserId}:${candidateProfileId}`;
  }

  private filterMatchListRanks(where?: {
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
  }> {
    let rows = [...this.matchListRanks.values()];
    if (!where) return rows;
    if (where.viewerUserId !== undefined) {
      rows = rows.filter((r) => r.viewerUserId === where.viewerUserId);
    }
    if (typeof where.candidateProfileId === 'string') {
      rows = rows.filter((r) => r.candidateProfileId === where.candidateProfileId);
    } else if (where.candidateProfileId?.notIn) {
      const excluded = new Set(where.candidateProfileId.notIn);
      rows = rows.filter((r) => !excluded.has(r.candidateProfileId));
    }
    if (where.hardBlocked !== undefined) {
      rows = rows.filter((r) => r.hardBlocked === where.hardBlocked);
    }
    if (typeof where.matchScore === 'number') {
      rows = rows.filter((r) => r.matchScore === where.matchScore);
    } else if (
      where.matchScore &&
      typeof where.matchScore === 'object' &&
      where.matchScore.lt !== undefined
    ) {
      const lt = where.matchScore.lt;
      rows = rows.filter((r) => r.matchScore < lt);
    }
    if (where.OR && where.OR.length > 0) {
      rows = rows.filter((r) =>
        where.OR!.some((clause) => {
          if (clause['hardBlocked'] !== undefined && r.hardBlocked !== clause['hardBlocked']) {
            return false;
          }
          const score = clause['matchScore'];
          if (typeof score === 'number' && r.matchScore !== score) return false;
          if (
            score &&
            typeof score === 'object' &&
            'lt' in (score as object) &&
            typeof (score as { lt?: number }).lt === 'number' &&
            !(r.matchScore < (score as { lt: number }).lt)
          ) {
            return false;
          }
          const cand = clause['candidateProfileId'];
          if (
            typeof cand === 'string' &&
            r.candidateProfileId !== cand
          ) {
            return false;
          }
          if (
            cand &&
            typeof cand === 'object' &&
            'gt' in (cand as object) &&
            typeof (cand as { gt?: string }).gt === 'string' &&
            !(r.candidateProfileId > (cand as { gt: string }).gt)
          ) {
            return false;
          }
          return true;
        }),
      );
    }
    return rows;
  }

  private readonly verifyIdToken = jest.fn();

  private readonly usersServiceMock = {
    findById: jest.fn(async (id: string) => {
      const identity = this.identitiesById.get(id);
      if (!identity) return null;
      return {
        id: identity.id,
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      };
    }),
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(async () => null),
    createFromGoogleIdentity: jest.fn(
      async (identity: { googleId: string; email: string; displayName: string }) => {
        const found = this.identitiesByGoogleId.get(identity.googleId);
        if (!found) {
          throw new Error(`Harness: unknown googleId ${identity.googleId}`);
        }
        return {
          id: found.id,
          email: found.email,
          googleId: found.googleId,
          displayName: found.displayName,
          avatarUrl: null,
          status: UserStatus.ACTIVE,
        };
      },
    ),
    updateLoginFields: jest.fn(),
  };

  private attachRelations(
    row: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!row) return row;
    const withPref = {
      ...row,
      preference: this.preferences.get(row['id'] as string) ?? null,
    };
    if (withPref['status'] !== 'ANALYZED') return withPref;
    const approvedPhotos = (this.photosByProfileId.get(row['id'] as string) ?? [])
      .filter((p) => p.status === 'APPROVED')
      .map((p) => ({
        id: p.id,
        isPrimary: p.isPrimary,
        storageKey: p.storageKey,
      }));
    return {
      ...withPref,
      photos: approvedPhotos,
      user: { deletedAt: null },
    };
  }

  private profileHasPhotoStatus(
    profileId: string,
    status: string | undefined,
  ): boolean {
    const photos = this.photosByProfileId.get(profileId) ?? [];
    if (!status) return photos.length > 0;
    return photos.some((p) => p.status === status);
  }

  private profileIdForUserId(userId: string): string {
    return `prof_${userId}`;
  }

  readonly narrativeCachePrisma = createMatchNarrativeCachePrismaMock();
  readonly matchNarrativeGeneratorStub = createMatchNarrativeGeneratorStub();

  readonly prismaMock = {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(this.prismaMock)),
    $queryRaw: jest.fn(async (sql: { values: unknown[] }) => {
      const rows: Array<{
        profileId: string;
        evaluationJson: unknown;
        createdAt: unknown;
        version: unknown;
      }> = [];
      for (const profileId of sql.values as string[]) {
        const row = this.evaluations.get(profileId);
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
    matchNarrativeCache: this.narrativeCachePrisma.matchNarrativeCache,
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
          let rows = this.filterMatchListRanks(where);
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
        return this.filterMatchListRanks(where).length;
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
          const toDelete = this.filterMatchListRanks(where);
          for (const row of toDelete) {
            this.matchListRanks.delete(
              this.matchListRankKey(row.viewerUserId, row.candidateProfileId),
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
          const key = this.matchListRankKey(viewerUserId, candidateProfileId);
          const existing = this.matchListRanks.get(key);
          if (existing) {
            const next = {
              ...existing,
              matchScore: update.matchScore,
              hardBlocked: update.hardBlocked,
              builtAt: update.builtAt,
            };
            this.matchListRanks.set(key, next);
            return next;
          }
          const created = { ...create };
          this.matchListRanks.set(key, created);
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
            const key = this.matchListRankKey(
              row.viewerUserId,
              row.candidateProfileId,
            );
            if (this.matchListRanks.has(key)) continue;
            this.matchListRanks.set(key, {
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
          for (const [userId, sess] of this.sessionMap) {
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
    userProfile: {
      findUnique: jest.fn(
        async ({ where }: { where: { userId?: string; id?: string } }) => {
          let row: Record<string, unknown> | null = null;
          if (where.userId !== undefined) {
            row = this.profiles.get(this.profileIdForUserId(where.userId)) ?? null;
          } else if (where.id !== undefined) {
            row = this.profiles.get(where.id) ?? null;
          }
          return this.attachRelations(row);
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
          const rows = [...this.profiles.values()];
          return rows
            .filter((p) => {
              if (where?.userId?.not && p['userId'] === where.userId.not) return false;
              if (where?.status && p['status'] !== where.status) return false;
              if (where?.photos?.some) {
                const requiredStatus = where.photos.some.status;
                if (
                  !this.profileHasPhotoStatus(p['id'] as string, requiredStatus)
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
            .map((p) => this.attachRelations(p)!);
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
          const rows = [...this.profiles.values()];
          return rows.filter((p) => {
            if (where?.userId?.not && p['userId'] === where.userId.not) return false;
            if (where?.status && p['status'] !== where.status) return false;
            if (where?.photos?.some) {
              const requiredStatus = where.photos.some.status;
              if (
                !this.profileHasPhotoStatus(p['id'] as string, requiredStatus)
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
          const id = this.profileIdForUserId(userId);
          const { user: _user, ...rest } = data;
          const row: Record<string, unknown> = {
            ...makeBaseProfileRow(id, userId),
            ...rest,
          };
          this.profiles.set(id, row);
          // Baseline E2E never uploaded photos; production submit/matches require
          // ≥1 APPROVED. Seed one so create→submit→markAnalyzed stays green.
          if ((this.photosByProfileId.get(id) ?? []).length === 0) {
            this.photosByProfileId.set(id, [
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
          const id = where.id ?? this.profileIdForUserId(where.userId as string);
          const state = this.profiles.get(id);
          if (!state) throw new Error(`Harness: no profile to update for id=${id}`);
          const updated = { ...state, ...data, updatedAt: new Date() };
          this.profiles.set(id, updated);
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
          const existing = this.preferences.get(profileId);
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
          this.preferences.set(profileId, merged);
          return merged;
        },
      ),
    },
    userProfileEvaluation: {
      findFirst: jest.fn(async ({ where }: { where: { profileId: string } }) =>
        this.evaluations.get(where.profileId) ?? null,
      ),
      findMany: jest.fn(
        async ({ where }: { where?: { profileId?: { in?: string[] } } } = {}) => {
          const ids = where?.profileId?.in ?? [];
          return ids
            .map((id) => this.evaluations.get(id))
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
          this.evaluations.set(data.profileId, row);
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
          const rows = [...this.matchActions.values()];
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
            this.matchActions.get(`${actorUserId}:${targetUserId}`) ?? null
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
          const existing = this.matchActions.get(key);
          if (existing) {
            const merged = { ...existing, ...update };
            this.matchActions.set(key, merged);
            return merged;
          }
          const row = {
            id: `ma_${actorUserId}_${targetUserId}`,
            createdAt: new Date(),
            ...create,
          };
          this.matchActions.set(key, row);
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
          const existing = this.matchActions.get(key);
          this.matchActions.delete(key);
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
          let rows = [...this.mutualMatches.values()];
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
          return this.mutualMatches.get(`${userId1}:${userId2}`) ?? null;
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
          for (const row of this.mutualMatches.values()) {
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
          this.mutualMatches.set(`${userId1}:${userId2}`, row);
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
          let rows = [...this.photosByProfileId.values()].flat();
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
          let rows = [...this.photosByProfileId.values()].flat();
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
          let rows = [...this.photosByProfileId.values()].flat();
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

  async init(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthSessionConfigModule,
        PrismaModule,
        SessionModule,
        UsersModule,
        StructuredLoggingModule,
        SimpleLoggerModule,
        AnalyticsModule,
        AuthModule,
        MeProfileModule,
      ],
    })
      .overrideProvider(PrismaService).useValue(this.prismaMock)
      .overrideProvider(AuthSessionConfigService).useValue(configStub)
      .overrideProvider(GoogleAuthService).useValue({ verifyIdToken: this.verifyIdToken })
      .overrideProvider(UsersService).useValue(this.usersServiceMock)
      .overrideProvider(LLM_CONFIG).useValue({ openai: { apiKey: 'test-key-not-used' }, models: new Map() })
      .overrideProvider(MeProfileAnalysisService).useValue({ runForUser: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(MeProfileValidationPipe).useValue({ transform: (v: unknown) => v })
      // Sprint 22 — keep detail path off live OpenAI; exercise cache DI with in-memory mock.
      .overrideProvider(MatchNarrativeGenerator)
      .useValue(this.matchNarrativeGeneratorStub)
      .overrideProvider(CONTENT_MODERATION)
      .useValue({
        checkContent: jest.fn().mockResolvedValue({
          flagged: false,
          categories: [],
          primaryCategory: null,
          score: 0,
          sexualScore: null,
          failOpen: false,
        }),
      })
      .overrideProvider(ContentViolationService)
      .useValue({
        getUserViolationStatus: jest.fn().mockResolvedValue({
          status: 'ok',
          mutedUntil: null,
          violationCount: 0,
        }),
        recordViolation: jest.fn().mockResolvedValue(undefined),
        getViolationCount: jest.fn().mockResolvedValue(0),
        isUserBlocked: jest.fn().mockResolvedValue(false),
        enforceViolationThreshold: jest.fn().mockResolvedValue({
          shouldBlock: false,
          reason: 'under_threshold',
        }),
      })
      .compile();

    this.app = moduleFixture.createNestApplication();
    this.app.use(requestCorrelationMiddleware);
    this.app.use(cookieParser());
    await this.app.init();
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  cookieHeader(raw: string): string {
    return `${SESSION_COOKIE}=${raw}`;
  }

  /** Signup + login via real POST /api/v1/auth/google; returns the raw session cookie value. */
  async signupAndLogin(identity: HarnessIdentity): Promise<string> {
    this.identitiesByGoogleId.set(identity.googleId, identity);
    this.identitiesById.set(identity.id, identity);
    this.verifyIdToken.mockResolvedValueOnce({
      googleId: identity.googleId,
      email: identity.email,
      displayName: identity.displayName,
      avatarUrl: null,
    });

    const loginRes = await request(this.app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: `mock-jwt-${identity.id}` });

    if (loginRes.status !== 200) {
      throw new Error(
        `Harness signup failed for ${identity.id}: ${loginRes.status} ${JSON.stringify(loginRes.body)}`,
      );
    }

    const raw = extractCookieValue(loginRes.headers as Record<string, unknown>, SESSION_COOKIE);
    if (!raw) throw new Error(`Harness: no session cookie set for ${identity.id}`);

    this.sessionMap.set(identity.id, { userId: identity.id, hash: hashSessionToken(raw, PEPPER) });
    return raw;
  }

  /** Real POST /api/v1/me/profile. */
  async createProfile(cookie: string, body: Record<string, unknown>) {
    return request(this.app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [this.cookieHeader(cookie)])
      .send(body);
  }

  /** Real PATCH /api/v1/me/profile — the production path for setting HG partner preferences. */
  async patchProfile(cookie: string, body: Record<string, unknown>) {
    return request(this.app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [this.cookieHeader(cookie)])
      .send(body);
  }

  /** Real POST /api/v1/me/profile/submit. */
  async submitProfile(cookie: string) {
    return request(this.app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [this.cookieHeader(cookie)]);
  }

  /**
   * Replace evaluation id (and optional json) after {@link markAnalyzed}.
   * Used to prove evaluation-keyed narrative cache miss on re-analysis.
   */
  remountEvaluation(
    profileId: string,
    opts: { evaluationId: string; evaluationJson?: unknown },
  ): void {
    const existing = this.evaluations.get(profileId);
    if (!existing) {
      throw new Error(`Harness: cannot remount unknown evaluation: ${profileId}`);
    }
    this.evaluations.set(profileId, {
      ...existing,
      id: opts.evaluationId,
      ...(opts.evaluationJson !== undefined
        ? { evaluationJson: opts.evaluationJson }
        : {}),
    });
  }

  /** Clear Sprint 22 narrative cache store between scenarios. */
  clearNarrativeCache(): void {
    this.narrativeCachePrisma.store.clear();
  }

  /**
   * Simulates the async analysis worker completing: advances the profile to ANALYZED and
   * writes a fixture `UserProfileEvaluation` row — exactly the technique used by the reference
   * spec's Step 4/Step 6. Must be called after a successful `submitProfile`.
   *
   * Also seeds one **APPROVED** photo when the profile has none yet, so baseline E2E flows
   * stay photo-gate eligible (production requires ≥1 APPROVED photo).
   */
  markAnalyzed(profileId: string, evaluationJson: unknown = VALID_EVAL_JSON): void {
    const row = this.profiles.get(profileId);
    if (!row) throw new Error(`Harness: cannot mark unknown profile ANALYZED: ${profileId}`);
    this.profiles.set(profileId, {
      ...row,
      status: 'ANALYZED',
      analyzedAt: new Date('2026-04-18T10:05:00.000Z'),
      lastAnalysisError: null,
      _count: { evaluations: 1 },
    });
    this.evaluations.set(profileId, {
      id: `eval_${profileId}`,
      profileId,
      version: 'v1',
      evaluationJson,
      createdAt: new Date('2026-04-18T10:05:00.000Z'),
    });
    const existing = this.photosByProfileId.get(profileId) ?? [];
    if (existing.length === 0) {
      this.setPhotos(profileId, [{ status: 'APPROVED', isPrimary: true }]);
    }
  }

  /**
   * Replace photos for a profile (Sprint 19 Story 2 — moderation visibility).
   * Call after {@link markAnalyzed} to force PENDING / FLAGGED / REJECTED-only fixtures.
   */
  setPhotos(
    profileId: string,
    specs: Array<{ status: HarnessPhotoStatus; isPrimary?: boolean }>,
  ): void {
    if (!this.profiles.has(profileId)) {
      throw new Error(`Harness: cannot set photos on unknown profile: ${profileId}`);
    }
    this.photosByProfileId.set(
      profileId,
      specs.map((spec, i) => ({
        id: `photo_${profileId}_${i}`,
        profileId,
        status: spec.status,
        isPrimary: spec.isPrimary ?? i === 0,
        storageKey: `uploads/${profileId}/${i}.jpg`,
        mimeType: 'image/jpeg',
      })),
    );
  }

  /** Real GET /api/v1/me/profile. */
  async getProfile(cookie: string) {
    return request(this.app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [this.cookieHeader(cookie)]);
  }

  /** Real GET /api/v1/me/matches (optional cursor pagination). */
  async getMatches(
    cookie: string,
    query?: { cursor?: string | null; limit?: number },
  ) {
    const params = new URLSearchParams();
    if (query?.cursor) params.set('cursor', query.cursor);
    if (query?.limit != null) params.set('limit', String(query.limit));
    const qs = params.toString();
    return request(this.app.getHttpServer())
      .get(`/api/v1/me/matches${qs ? `?${qs}` : ''}`)
      .set('Cookie', [this.cookieHeader(cookie)]);
  }

  /** Real GET /api/v1/me/matches/:id. */
  async getMatchById(cookie: string, candidateProfileId: string) {
    return request(this.app.getHttpServer())
      .get(`/api/v1/me/matches/${encodeURIComponent(candidateProfileId)}`)
      .set('Cookie', [this.cookieHeader(cookie)]);
  }

  /** Real POST /api/v1/me/matches/:id/actions. */
  async postMatchAction(
    cookie: string,
    candidateProfileId: string,
    action: 'LIKE' | 'PASS' | 'BLOCK',
  ) {
    return request(this.app.getHttpServer())
      .post(`/api/v1/me/matches/${encodeURIComponent(candidateProfileId)}/actions`)
      .set('Cookie', [this.cookieHeader(cookie)])
      .send({ action });
  }
}
