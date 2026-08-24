/**
 * Shared boot/state harness for Sprint 16/17 eligibility + ranking regression specs.
 * Test support only — excluded from Nest dist via tsconfig.build.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserStatus } from '@prisma/client';
import { JwtAuthConfigModule } from '../../../config/jwt-auth-config.module';
import { JwtAuthConfigService } from '../../../config/jwt-auth-config.service';
import { jwtConfigStub } from '../../../auth/auth-test.stub';
import { AuthModule } from '../../../auth/auth.module';
import { GoogleAuthService } from '../../../auth/google-auth.service';
import { AuthSessionConfigModule } from '../../../config/auth-session-config.module';
import { AuthSessionConfigService } from '../../../config/auth-session-config.service';
import { LLM_CONFIG } from '../../../llm/llm.constants';
import { requestCorrelationMiddleware } from '../../../logging/request-correlation.middleware';
import { SimpleLoggerModule } from '../../../logger/simple-logger.module';
import { StructuredLoggingModule } from '../../../logging/structured-logging.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashSessionToken } from '../../../session/session-token.crypto';
import { SessionModule } from '../../../session/session.module';
import { UsersModule } from '../../../users/users.module';
import { UsersService } from '../../../users/users.service';
import { MatchNarrativeGenerator } from '../../../matches/match-narrative';
import { CONTENT_MODERATION } from '../../../content-moderation/content-moderation.ports';
import { ContentViolationService } from '../../../content-moderation/content-violation.service';
import { MeProfileAnalysisService } from '../../profile/me-profile-analysis.service';
import { AnalyticsModule } from '../../../analytics/analytics.module';
import {
  createMatchNarrativeCachePrismaMock,
  createMatchNarrativeGeneratorStub,
} from './match-narrative-test-stubs';
import { MeProfileModule } from '../../me-profile.module';
import { MeProfileValidationPipe } from '../../me-profile-validation.pipe';
import { extractCookieValue } from './me-matches-eligibility.builders';
import {
  configStub,
  type HarnessIdentity,
  type HarnessPhotoRow,
  type HarnessPhotoStatus,
  PEPPER,
  SESSION_COOKIE,
  VALID_EVAL_JSON,
} from './me-matches-eligibility.fixtures';
import {
  buildEligibilityPrismaMock,
  type EligibilityHarnessHost,
} from './me-matches-eligibility.prisma-mock';

/**
 * Generalized (N-profile) in-memory Prisma-backed test harness for real HTTP flows through
 * signup Î“Ã¥Ã† profile create/patch Î“Ã¥Ã† submit Î“Ã¥Ã† simulate ANALYZED Î“Ã¥Ã† GET /api/v1/me/matches.
 */
export class EligibilityTestHarness implements EligibilityHarnessHost {
  app!: INestApplication<App>;

  readonly profiles = new Map<string, Record<string, unknown>>();
  readonly evaluations = new Map<string, Record<string, unknown>>();
  readonly preferences = new Map<string, Record<string, unknown>>();
  /** Profile photos keyed by profile id (Sprint 19 Story 2 visibility). */
  readonly photosByProfileId = new Map<string, HarnessPhotoRow[]>();
  readonly sessionMap = new Map<string, { userId: string; hash: string }>();
  readonly identitiesByGoogleId = new Map<string, HarnessIdentity>();
  readonly identitiesById = new Map<string, HarnessIdentity>();
  /** Key: `${actorUserId}:${targetUserId}` */
  readonly matchActions = new Map<string, Record<string, unknown>>();
  /** Key: `${userId1}:${userId2}` (sorted pair) */
  readonly mutualMatches = new Map<string, Record<string, unknown>>();
  /** Key: `${viewerUserId}:${candidateProfileId}` Î“Ã‡Ã¶ Sprint 46 / 38.3 materialized list. */
  readonly matchListRanks = new Map<
    string,
    {
      viewerUserId: string;
      candidateProfileId: string;
      matchScore: number;
      hardBlocked: boolean;
      builtAt: Date;
    }
  >();

  matchListRankKey(viewerUserId: string, candidateProfileId: string): string {
    return `${viewerUserId}:${candidateProfileId}`;
  }

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

  attachRelations(
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

  profileHasPhotoStatus(
    profileId: string,
    status: string | undefined,
  ): boolean {
    const photos = this.photosByProfileId.get(profileId) ?? [];
    if (!status) return photos.length > 0;
    return photos.some((p) => p.status === status);
  }

  profileIdForUserId(userId: string): string {
    return `prof_${userId}`;
  }

  readonly narrativeCachePrisma = createMatchNarrativeCachePrismaMock();
  readonly matchNarrativeGeneratorStub = createMatchNarrativeGeneratorStub();

  readonly prismaMock = buildEligibilityPrismaMock(this);
  async init(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthSessionConfigModule,
        JwtAuthConfigModule,
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
      .overrideProvider(JwtAuthConfigService).useValue(jwtConfigStub)
      .overrideProvider(GoogleAuthService).useValue({ verifyIdToken: this.verifyIdToken })
      .overrideProvider(UsersService).useValue(this.usersServiceMock)
      .overrideProvider(LLM_CONFIG).useValue({ openai: { apiKey: 'test-key-not-used' }, models: new Map() })
      .overrideProvider(MeProfileAnalysisService).useValue({ runForUser: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(MeProfileValidationPipe).useValue({ transform: (v: unknown) => v })
      // Sprint 22 Î“Ã‡Ã¶ keep detail path off live OpenAI; exercise cache DI with in-memory mock.
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

  /** Real PATCH /api/v1/me/profile Î“Ã‡Ã¶ the production path for setting HG partner preferences. */
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
   * writes a fixture `UserProfileEvaluation` row Î“Ã‡Ã¶ exactly the technique used by the reference
   * spec's Step 4/Step 6. Must be called after a successful `submitProfile`.
   *
   * Also seeds one **APPROVED** photo when the profile has none yet, so baseline E2E flows
   * stay photo-gate eligible (production requires Î“Ã«Ã‘1 APPROVED photo).
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
   * Replace photos for a profile (Sprint 19 Story 2 Î“Ã‡Ã¶ moderation visibility).
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
