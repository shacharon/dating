/**
 * Sprint 17 Story 3 — dealbreaker guardrails + user visibility E2E (integration).
 *
 * 1. Kill switch demotes HARD smoking → SOFT so conflicting smoker is included.
 * 2. GET /api/v1/me/profile surfaces inferredDealbreakers (hard only) with evidence.
 *
 * Story 2 dealbreaker eligibility scenarios stay in me-new-model-e2e-dealbreaker.integration.spec.ts
 * (unmodified). Baselines me-new-model-e2e*.integration.spec.ts also unmodified.
 *
 * Harness: `me-matches-eligibility-harness.ts`
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e-dealbreaker-guardrails.integration" --runInBand
 */

import {
  EligibilityTestHarness,
  makeEvalJson,
  makeIdentity,
} from './me-matches-eligibility-harness';

describe('Holy Grail dealbreaker guardrails (Sprint 17 Story 3 integration)', () => {
  const harness = new EligibilityTestHarness();

  beforeAll(async () => {
    await harness.init();
  });

  afterAll(async () => {
    await harness.close();
  });

  afterEach(() => {
    delete process.env['DEALBREAKER_HARD_DISABLED_TAGS'];
  });

  async function createSubmitAnalyze(
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<string> {
    const createRes = await harness.createProfile(cookie, body);
    expect(createRes.status).toBe(201);
    const profileId: string = createRes.body.id;

    const submitRes = await harness.submitProfile(cookie);
    expect(submitRes.status).toBe(202);

    harness.markAnalyzed(
      profileId,
      makeEvalJson({
        ambition: 0.6,
        socialBattery: 0.5,
        emotionalDepth: 0.7,
        attachmentSecurity: 0.6,
      }),
    );
    return profileId;
  }

  async function setupPair(opts: {
    key: string;
    searcherAboutPartner: string;
    counterpartyAboutMe: string;
  }): Promise<{
    searcherCookie: string;
    searcherProfileId: string;
    counterpartyProfileId: string;
  }> {
    const searcher = makeIdentity(`${opts.key}-searcher`);
    const counterparty = makeIdentity(`${opts.key}-counterparty`);

    const searcherCookie = await harness.signupAndLogin(searcher);
    const counterpartyCookie = await harness.signupAndLogin(counterparty);

    const searcherProfileId = await createSubmitAnalyze(searcherCookie, {
      aboutMe: 'I enjoy hiking and coffee',
      aboutPartner: opts.searcherAboutPartner,
      aboutRelationship: 'Looking for a long-term relationship',
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'],
      birthDate: '1990-06-15',
    });

    const counterpartyProfileId = await createSubmitAnalyze(counterpartyCookie, {
      aboutMe: opts.counterpartyAboutMe,
      aboutPartner: 'Someone kind',
      aboutRelationship: 'Open to something serious',
      gender: 'FEMALE',
      birthDate: '1992-03-20',
    });

    return { searcherCookie, searcherProfileId, counterpartyProfileId };
  }

  describe('Scenario 1 — kill switch demotes HARD smoking → included', () => {
    it('includes smoker when DEALBREAKER_HARD_DISABLED_TAGS=smoking', async () => {
      process.env['DEALBREAKER_HARD_DISABLED_TAGS'] = 'smoking';

      const { searcherCookie, searcherProfileId, counterpartyProfileId } =
        await setupPair({
          key: 'dbg1',
          searcherAboutPartner: "I don't want smokers",
          counterpartyAboutMe: 'I smoke and love jazz',
        });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.viewerProfileId).toBe(searcherProfileId);
      expect(
        res.body.matches.find((m: { id: string }) => m.id === counterpartyProfileId),
      ).toBeDefined();
    });
  });

  describe('Scenario 2 — inferredDealbreakers on GET /me/profile', () => {
    it('returns smoking HARD_EXCLUDE with evidence quote', async () => {
      delete process.env['DEALBREAKER_HARD_DISABLED_TAGS'];

      const searcher = makeIdentity('dbg2-searcher');
      const searcherCookie = await harness.signupAndLogin(searcher);

      const createRes = await harness.createProfile(searcherCookie, {
        aboutMe: 'I enjoy hiking and coffee',
        aboutPartner: "I don't want smokers",
        aboutRelationship: 'Looking for a long-term relationship',
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
        birthDate: '1990-06-15',
      });
      expect(createRes.status).toBe(201);

      const res = await harness.getProfile(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.inferredDealbreakers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tag: 'smoking',
            classification: 'HARD_EXCLUDE',
            evidence: "don't want smokers",
            confidence: expect.any(Number),
          }),
        ]),
      );
      expect(
        res.body.inferredDealbreakers.every(
          (d: { classification: string }) =>
            d.classification === 'HARD_EXCLUDE' ||
            d.classification === 'HARD_REQUIRE',
        ),
      ).toBe(true);
    });
  });
});
