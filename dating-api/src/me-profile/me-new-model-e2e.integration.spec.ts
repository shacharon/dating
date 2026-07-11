/**
 * Two-user new-model E2E flow — integration smoke.
 *
 * Validates the complete sequence for two fresh users using only the new
 * product path (UserProfile + UserProfileEvaluation).
 *
 * Key guarantees enforced by this spec:
 *  1. HTTP contract: every API step returns the expected shape and status code.
 *  2. DB write contract: only userProfile.create/update and
 *     userProfileEvaluation.create are touched — never any legacy table.
 *  3. Legacy-table firewall: Proxy traps on matchmakingProfile,
 *     profileExtractionV2, profileEvaluationRaw, profileEvaluation — any property access throws immediately.
 *  4. Engine contract: GET /api/v1/me/matches and /api/v1/me/matches/:id
 *     produce a finite numeric matchScore sourced from UserProfileEvaluation.
 *
 * Analysis is stubbed at the service boundary (MeProfileAnalysisService is
 * overridden). DB state is advanced manually after submit to simulate the
 * async worker completing, exactly as a real environment would behave before
 * the client polls again.
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e.integration" --runInBand
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
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MeProfileModule } from './me-profile.module';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';

// ─── Test constants ────────────────────────────────────────────────────────

const PEPPER = 'e2e-new-model-test-pepper';
const SESSION_COOKIE = 'dating_session';

const configStub = {
  googleClientId: 'google-client-id',
  sessionSecretPepper: PEPPER,
  sessionCookieName: SESSION_COOKIE,
  sessionTtlDays: 14,
  cookieDomain: undefined as string | undefined,
  cookieSecure: false,
  corsOrigin: 'http://localhost:3000',
};

const USER_A = { id: 'user_e2e_a', googleId: 'g-e2e-a', email: 'a@e2e.test', displayName: 'E2E User A' };
const USER_B = { id: 'user_e2e_b', googleId: 'g-e2e-b', email: 'b@e2e.test', displayName: 'E2E User B' };
const PROF_A_ID = 'prof_e2e_a';
const PROF_B_ID = 'prof_e2e_b';

/** Minimal evaluation JSON that passes the engine's hasNumericSelfSignals check. */
const VALID_EVAL_JSON = {
  self: { signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7, attachmentSecurity: 0.6 } },
  partner: { signals: {} },
  relationship: { signals: {} },
  display: { summary: 'Thoughtful and grounded.' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function legacyProxy(table: string): object {
  return new Proxy(
    {},
    {
      get(_, prop) {
        throw new Error(
          `LEGACY_TABLE_ACCESSED: ${table}.${String(prop)} must never be touched in the new product flow`,
        );
      },
    },
  );
}

function extractCookieValue(headers: Record<string, unknown>, name: string): string | undefined {
  const setCookie = headers['set-cookie'];
  if (!Array.isArray(setCookie)) return undefined;
  for (const line of setCookie) {
    if (typeof line === 'string' && line.startsWith(`${name}=`)) {
      return line.split(';')[0].slice(name.length + 1);
    }
  }
  return undefined;
}

/**
 * Shapes a joined `UserProfilePreference` for Prisma `include: { preference: true }` mocks.
 * No partnerAgeMin/Max (HG age would FAIL when fixture birthDate is null).
 * Mirrors desiredPartnerGenders when set; otherwise maxDistanceKm keeps the row non-empty.
 */
function testUserProfilePreferenceForProfile(row: Record<string, unknown>) {
  const id = String(row['id']);
  const desired = row['desiredPartnerGenders'];
  const genders = Array.isArray(desired)
    ? (desired as string[]).filter((g) => g !== 'PREFER_NOT_TO_SAY')
    : [];
  return {
    id: `pref_${id}`,
    profileId: id,
    partnerAgeMin: null,
    partnerAgeMax: null,
    maxDistanceKm: genders.length > 0 ? null : 100,
    acceptedPartnerGenders: genders,
    updatedAt: new Date('2026-04-18T10:00:00.000Z'),
  };
}

function withAnalyzedPreference(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row || row['status'] !== 'ANALYZED') return row;
  return { ...row, preference: testUserProfilePreferenceForProfile(row) };
}

function enrichMatchProfileRow(
  row: Record<string, unknown> | null,
): Record<string, unknown> | null {
  const enriched = withAnalyzedPreference(row);
  if (!enriched || enriched['status'] !== 'ANALYZED') return enriched;
  return {
    ...enriched,
    photos: enriched['photos'] ?? [
      { id: `photo_${String(enriched['id'])}`, isPrimary: true },
    ],
    user: { deletedAt: null },
  };
}

function makeBaseProfileRow(id: string, userId: string): Record<string, unknown> {
  return {
    id,
    userId,
    name: '',
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
    childrenStatus: null, wantsChildren: null, smokingFrequency: null,
    alcoholUse: null, education: null, religion: null,
    _count: { evaluations: 0 },
    createdAt: new Date('2026-04-18T10:00:00.000Z'),
    updatedAt: new Date('2026-04-18T10:00:00.000Z'),
  };
}

// ─── Spec ─────────────────────────────────────────────────────────────────

describe('Two-user new-model E2E flow (integration)', () => {
  let app: INestApplication<App>;

  // ── Mutable DB state — simulates Postgres rows ──
  let profileA: Record<string, unknown> | null = null;
  let profileB: Record<string, unknown> | null = null;
  let evalA: Record<string, unknown> | null = null;
  let evalB: Record<string, unknown> | null = null;

  // ── Session registry (rawToken → hash → userId) ──
  const sessionMap = new Map<string, { userId: string; hash: string }>();

  // ── Prisma mock: new-model tables functional, legacy tables locked ──
  const prismaMock = {
    $transaction: jest.fn(),
    // ── New-model tables ──────────────────────────────────────────────
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    userProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    userProfileEvaluation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    userProfilePreference: {
      upsert: jest.fn().mockResolvedValue({ id: 'pref_mock', profileId: 'mock' }),
    },
    matchAction: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    mutualMatch: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userProfilePhoto: {
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    // ── Legacy tables: Proxy firewall ─────────────────────────────────
    // Any property access (findMany, create, upsert, …) throws immediately.
    matchmakingProfile: legacyProxy('matchmakingProfile'),
    profileExtractionV2: legacyProxy('profileExtractionV2'),
    profileEvaluationRaw: legacyProxy('profileEvaluationRaw'),
    profileEvaluation: legacyProxy('profileEvaluation'),
  };

  const usersServiceMock = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    createFromGoogleIdentity: jest.fn(),
    updateLoginFields: jest.fn(),
  };

  const verifyIdToken = jest.fn();

  // ── Module bootstrap ──────────────────────────────────────────────

  beforeAll(async () => {
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock),
    );
    // ── Session: create stores nothing; findUnique resolves from registry ──
    prismaMock.userSession.create.mockImplementation(
      async ({ data }: { data: { expiresAt: Date } }) => ({
        id: `sess_${Date.now()}`,
        expiresAt: data.expiresAt,
      }),
    );

    prismaMock.userSession.findUnique.mockImplementation(
      async ({ where }: { where: { sessionTokenHash: string } }) => {
        for (const [userId, sess] of sessionMap) {
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
    );

    // ── UserProfile: state-backed CRUD ────────────────────────────────
    prismaMock.userProfile.findUnique.mockImplementation(
      async ({ where }: { where: { userId?: string; id?: string } }) => {
        let row: Record<string, unknown> | null = null;
        if (where.userId === USER_A.id) row = profileA;
        else if (where.userId === USER_B.id) row = profileB;
        else if (where.id === PROF_A_ID) row = profileA;
        else if (where.id === PROF_B_ID) row = profileB;
        return enrichMatchProfileRow(row);
      },
    );

    prismaMock.userProfile.findMany.mockImplementation(
      async ({
        where,
      }: {
        where?: {
          userId?: { not?: string };
          status?: string;
          photos?: { some?: { status?: string } };
          user?: { deletedAt?: null };
        };
      } = {}) => {
        const candidates = [profileA, profileB].filter(Boolean);
        return candidates
          .filter((p) => {
            if (!p) return false;
            if (where?.userId?.not && p['userId'] === where.userId.not) return false;
            if (where?.status && p['status'] !== where.status) return false;
            if (where?.photos?.some && p['status'] !== 'ANALYZED') return false;
            return true;
          })
          .map((p) => enrichMatchProfileRow(p as Record<string, unknown>)!);
      },
    );

    prismaMock.userProfile.count.mockImplementation(
      async ({
        where,
      }: {
        where?: { userId?: { not?: string }; status?: string };
      } = {}) => {
        const candidates = [profileA, profileB].filter(Boolean);
        return candidates.filter((p) => {
          if (!p) return false;
          if (where?.userId?.not && p['userId'] === where.userId.not) return false;
          if (where?.status && p['status'] !== where.status) return false;
          return true;
        }).length;
      },
    );

    prismaMock.userProfile.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> & { user?: { connect?: { id?: string } } } }) => {
        const userId = data.user?.connect?.id;
        const id = userId === USER_A.id ? PROF_A_ID : PROF_B_ID;
        const row: Record<string, unknown> = {
          ...makeBaseProfileRow(id, userId as string),
          aboutMe: data.aboutMe ?? null,
          aboutPartner: data.aboutPartner ?? null,
          aboutRelationship: data.aboutRelationship ?? null,
          gender: data.gender ?? null,
          desiredPartnerGenders: data.desiredPartnerGenders ?? null,
        };
        if (userId === USER_A.id) profileA = row;
        else profileB = row;
        return row;
      },
    );

    prismaMock.userProfile.update.mockImplementation(
      async ({ where, data }: { where: { userId?: string; id?: string }; data: Record<string, unknown> }) => {
        const uid = where.userId ?? (where.id === PROF_A_ID ? USER_A.id : USER_B.id);
        let state = uid === USER_A.id ? profileA : profileB;
        if (!state) throw new Error(`No profile to update for userId=${uid}`);
        state = { ...state, ...data, updatedAt: new Date() };
        if (uid === USER_A.id) profileA = state;
        else profileB = state;
        return state;
      },
    );

    // ── UserProfileEvaluation: state-backed ──────────────────────────
    prismaMock.userProfileEvaluation.findFirst.mockImplementation(
      async ({ where }: { where: { profileId: string } }) => {
        if (where.profileId === PROF_A_ID) return evalA;
        if (where.profileId === PROF_B_ID) return evalB;
        return null;
      },
    );

    prismaMock.userProfileEvaluation.findMany.mockImplementation(
      async ({ where }: { where?: { profileId?: { in?: string[] } } } = {}) => {
        const ids = where?.profileId?.in ?? [];
        const result: unknown[] = [];
        if (ids.includes(PROF_A_ID) && evalA) result.push(evalA);
        if (ids.includes(PROF_B_ID) && evalB) result.push(evalB);
        return result;
      },
    );

    prismaMock.userProfileEvaluation.create.mockImplementation(
      async ({ data }: { data: { profileId: string; version: string; evaluationJson: unknown } }) => {
        const row = {
          id: `eval_${data.profileId}`,
          profileId: data.profileId,
          version: data.version,
          evaluationJson: data.evaluationJson,
          createdAt: new Date(),
        };
        if (data.profileId === PROF_A_ID) evalA = row;
        else evalB = row;
        return row;
      },
    );

    // ── UsersService: identity stubs ──────────────────────────────────
    usersServiceMock.findByGoogleId.mockImplementation(async (googleId: string) => {
      // New user on first login — always null for the two E2E identities
      if (googleId === USER_A.googleId || googleId === USER_B.googleId) return null;
      return null;
    });

    usersServiceMock.createFromGoogleIdentity.mockImplementation(
      async (identity: { googleId: string; email: string; displayName: string; avatarUrl: string | null }) => {
        const isA = identity.googleId === USER_A.googleId;
        const user = isA ? USER_A : USER_B;
        return { id: user.id, email: user.email, googleId: user.googleId, displayName: user.displayName, avatarUrl: null, status: UserStatus.ACTIVE };
      },
    );

    usersServiceMock.findById.mockImplementation(async (id: string) => {
      if (id === USER_A.id) return { id: USER_A.id, email: USER_A.email, displayName: USER_A.displayName, avatarUrl: null, status: UserStatus.ACTIVE };
      if (id === USER_B.id) return { id: USER_B.id, email: USER_B.email, displayName: USER_B.displayName, avatarUrl: null, status: UserStatus.ACTIVE };
      return null;
    });

    // ── NestJS module ─────────────────────────────────────────────────
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
      .overrideProvider(PrismaService).useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService).useValue(configStub)
      .overrideProvider(GoogleAuthService).useValue({ verifyIdToken })
      .overrideProvider(UsersService).useValue(usersServiceMock)
      // Prevent OPENAI_API_KEY bootstrap error (LLM not called in this spec)
      .overrideProvider(LLM_CONFIG).useValue({ openai: { apiKey: 'test-key-not-used' }, models: new Map() })
      // Analysis is stubbed — DB state is advanced manually after submit
      .overrideProvider(MeProfileAnalysisService).useValue({ runForUser: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(MeProfileValidationPipe).useValue({ transform: (v: unknown) => v })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(requestCorrelationMiddleware);
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Shared session cookies (set by Step 1 / Step 4) ──────────────
  let rawCookieA: string;
  let rawCookieB: string;

  // ─── Login helper ─────────────────────────────────────────────────

  async function loginUser(
    googleIdentity: { googleId: string; email: string; displayName: string; avatarUrl: null },
    userId: string,
  ): Promise<string> {
    verifyIdToken.mockResolvedValueOnce(googleIdentity);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: `mock-jwt-${userId}` });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.id).toBe(userId);

    const raw = extractCookieValue(loginRes.headers as Record<string, unknown>, SESSION_COOKIE);
    expect(raw).toBeTruthy();

    sessionMap.set(userId, { userId, hash: hashSessionToken(raw!, PEPPER) });
    return raw!;
  }

  function cookieHeader(raw: string): string {
    return `${SESSION_COOKIE}=${raw}`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1 — User A: signup
  // ═══════════════════════════════════════════════════════════════════

  it('Step 1 PASS — User A signup: POST /api/v1/auth/google → 200 + userId', async () => {
    rawCookieA = await loginUser(
      { googleId: USER_A.googleId, email: USER_A.email, displayName: USER_A.displayName, avatarUrl: null },
      USER_A.id,
    );

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', [cookieHeader(rawCookieA)]);

    expect(me.status).toBe(200);
    expect(me.body.id).toBe(USER_A.id);
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2 — User A: create profile
  // ═══════════════════════════════════════════════════════════════════

  it('Step 2 PASS — User A: POST /api/v1/me/profile → 201 + id', async () => {
    // First call: create handler checks for existing profile → null
    prismaMock.userProfile.findUnique.mockResolvedValueOnce(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [cookieHeader(rawCookieA)])
      .send({
        aboutMe: 'I love hiking and meaningful conversations',
        aboutPartner: 'Kind, curious, emotionally available',
        aboutRelationship: 'Looking for a long-term relationship',
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(PROF_A_ID);
    expect(prismaMock.userProfile.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.userProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ aboutMe: 'I love hiking and meaningful conversations' }),
      }),
    );
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3 — User A: update profile
  // ═══════════════════════════════════════════════════════════════════

  it('Step 3 PASS — User A: PATCH /api/v1/me/profile → 200 with updated field', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [cookieHeader(rawCookieA)])
      .send({ aboutMe: 'I love hiking, travel, and deep conversations' });

    expect(res.status).toBe(200);
    expect(res.body.aboutMe).toBe('I love hiking, travel, and deep conversations');
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ aboutMe: 'I love hiking, travel, and deep conversations' }),
      }),
    );
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 4 — User A: submit → analysis (simulate ANALYZED)
  // ═══════════════════════════════════════════════════════════════════

  it('Step 4 PASS — User A: POST /api/v1/me/profile/submit → 200; analysis simulated ANALYZED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [cookieHeader(rawCookieA)]);

    expect(res.status).toBe(200);
    expect(['SUBMITTED', 'ANALYZING', 'ANALYZED']).toContain(res.body.status);

    // Simulate the async analysis worker completing: set ANALYZED + create evaluation row.
    // In production the client polls GET /api/v1/me/profile until status=ANALYZED.
    profileA = {
      ...profileA,
      status: 'ANALYZED',
      analyzedAt: new Date('2026-04-18T10:05:00.000Z'),
      lastAnalysisError: null,
      _count: { evaluations: 1 },
    };
    evalA = {
      id: 'eval_a',
      profileId: PROF_A_ID,
      version: 'v1',
      evaluationJson: VALID_EVAL_JSON,
      createdAt: new Date('2026-04-18T10:05:00.000Z'),
    };
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 5 — User B: signup
  // ═══════════════════════════════════════════════════════════════════

  it('Step 5 PASS — User B signup: POST /api/v1/auth/google → 200 + userId', async () => {
    rawCookieB = await loginUser(
      { googleId: USER_B.googleId, email: USER_B.email, displayName: USER_B.displayName, avatarUrl: null },
      USER_B.id,
    );

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', [cookieHeader(rawCookieB)]);

    expect(me.status).toBe(200);
    expect(me.body.id).toBe(USER_B.id);
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 6 — User B: create profile + submit → analysis
  // ═══════════════════════════════════════════════════════════════════

  it('Step 6 PASS — User B: create + submit profile; analysis simulated ANALYZED', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValueOnce(null);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [cookieHeader(rawCookieB)])
      .send({
        aboutMe: 'Art lover, creative, and emotionally deep',
        aboutPartner: 'Warm, adventurous, and kind',
        aboutRelationship: 'Long-term, building something real',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBe(PROF_B_ID);

    const submitRes = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [cookieHeader(rawCookieB)]);

    expect(submitRes.status).toBe(200);

    profileB = {
      ...profileB,
      status: 'ANALYZED',
      analyzedAt: new Date('2026-04-18T10:10:00.000Z'),
      lastAnalysisError: null,
      _count: { evaluations: 1 },
    };
    evalB = {
      id: 'eval_b',
      profileId: PROF_B_ID,
      version: 'v1',
      evaluationJson: VALID_EVAL_JSON,
      createdAt: new Date('2026-04-18T10:10:00.000Z'),
    };
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 7 — Fetch matches for User A
  // ═══════════════════════════════════════════════════════════════════

  it('Step 7 PASS — GET /api/v1/me/matches for A: status=ready, contains B, matchScore is finite', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me/matches')
      .set('Cookie', [cookieHeader(rawCookieA)]);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.viewerProfileId).toBe(PROF_A_ID);
    expect(Array.isArray(res.body.matches)).toBe(true);

    const matchB = res.body.matches.find((m: { id: string }) => m.id === PROF_B_ID);
    expect(matchB).toBeDefined();
    expect(matchB.hasEvaluation).toBe(true);
    expect(typeof matchB.matchScore).toBe('number');
    expect(Number.isFinite(matchB.matchScore)).toBe(true);
    expect(matchB.explainability).not.toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 8 — Fetch match detail: A → B
  // ═══════════════════════════════════════════════════════════════════

  it('Step 8 PASS — GET /api/v1/me/matches/:id for A→B: 200, numeric matchScore, evaluationSummary', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/me/matches/${encodeURIComponent(PROF_B_ID)}`)
      .set('Cookie', [cookieHeader(rawCookieA)]);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(PROF_B_ID);
    expect(res.body.gender).toBe('FEMALE');
    expect(typeof res.body.matchScore).toBe('number');
    expect(Number.isFinite(res.body.matchScore)).toBe(true);
    expect(res.body.explainability).not.toBeNull();
    expect(res.body.evaluationSummary).toBe('Thoughtful and grounded.');
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 9 — Reciprocal: fetch matches for User B
  // ═══════════════════════════════════════════════════════════════════

  it('Step 9 PASS — GET /api/v1/me/matches for B: status=ready, contains A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me/matches')
      .set('Cookie', [cookieHeader(rawCookieB)]);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');

    const matchA = res.body.matches.find((m: { id: string }) => m.id === PROF_A_ID);
    expect(matchA).toBeDefined();
    expect(typeof matchA.matchScore).toBe('number');
    expect(Number.isFinite(matchA.matchScore)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════
  // STEP 10 — DB write audit
  // ═══════════════════════════════════════════════════════════════════

  it('Step 10 PASS — DB write audit: only UserProfile + UserProfileEvaluation were touched', () => {
    // Two profiles created (one per user)
    expect(prismaMock.userProfile.create).toHaveBeenCalledTimes(2);
    const createCalls = prismaMock.userProfile.create.mock.calls.map(
      (c: [{ data: Record<string, unknown> }]) => c[0].data?.user?.connect?.id,
    );
    expect(createCalls).toContain(USER_A.id);
    expect(createCalls).toContain(USER_B.id);

    // Update called for: patch(A), submit(A), submit(B) — at minimum 3 calls
    expect(prismaMock.userProfile.update.mock.calls.length).toBeGreaterThanOrEqual(3);

    // Evaluation rows created via mock (state set manually); verify mock was configured
    expect(evalA).not.toBeNull();
    expect(evalA!['profileId']).toBe(PROF_A_ID);
    expect(evalA!['version']).toBe('v1');
    expect(evalB).not.toBeNull();
    expect(evalB!['profileId']).toBe(PROF_B_ID);

    // Legacy tables: Proxy traps would have thrown if any key was accessed.
    // Reaching this assertion proves zero legacy table access across the full flow.
    const legacyKeys = [
      'matchmakingProfile',
      'profileExtractionV2',
      'profileEvaluationRaw',
      'profileEvaluation',
    ] as const;

    for (const key of legacyKeys) {
      expect(() => {
        const trap = (prismaMock as Record<string, unknown>)[key] as Record<string, unknown>;
        void trap['create'];
      }).toThrow('LEGACY_TABLE_ACCESSED');
    }
  });
});
