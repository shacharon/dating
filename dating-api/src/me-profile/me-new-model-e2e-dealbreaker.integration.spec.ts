/**
 * Sprint 17 Story 2 — dealbreaker hard-eligibility E2E (integration).
 *
 * Proves classifier-derived HARD_EXCLUDE / HARD_REQUIRE gate `GET /api/v1/me/matches`
 * with NEVER_BLOCKS on silence (Option C — no ranking-order assertions).
 *
 * Harness: `me-matches-eligibility.spec-support.ts` (real Nest + HTTP, in-memory Prisma).
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e-dealbreaker.integration" --runInBand
 */

import {
  EligibilityTestHarness,
  makeEvalJson,
  makeIdentity,
} from './me-matches-eligibility.spec-support';

describe('Holy Grail dealbreaker eligibility (Sprint 17 Story 2 integration)', () => {
  const harness = new EligibilityTestHarness();

  beforeAll(async () => {
    await harness.init();
  });

  afterAll(async () => {
    await harness.close();
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

  /** Compatible MALE→FEMALE pair so gender gates do not confound dealbreaker results. */
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

  function findMatch(
    matches: Array<{ id: string }>,
    profileId: string,
  ): { id: string } | undefined {
    return matches.find((m) => m.id === profileId);
  }

  describe('Scenario 1 — HARD_EXCLUDE + conflicting self-fact → excluded', () => {
    it('excludes counterparty who says "I smoke" when searcher says "don\'t want smokers"', async () => {
      const { searcherCookie, searcherProfileId, counterpartyProfileId } =
        await setupPair({
          key: 'db1',
          searcherAboutPartner: "I don't want smokers",
          counterpartyAboutMe: 'I smoke and love jazz',
        });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.viewerProfileId).toBe(searcherProfileId);
      expect(findMatch(res.body.matches, counterpartyProfileId)).toBeUndefined();
    });
  });

  describe('Scenario 2 — HARD_EXCLUDE + silence → included (NEVER_BLOCKS)', () => {
    it('includes silent counterparty when searcher says "don\'t want smokers"', async () => {
      const { searcherCookie, searcherProfileId, counterpartyProfileId } =
        await setupPair({
          key: 'db2',
          searcherAboutPartner: "I don't want smokers",
          counterpartyAboutMe: 'I love hiking and travel',
        });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.viewerProfileId).toBe(searcherProfileId);
      expect(findMatch(res.body.matches, counterpartyProfileId)).toBeDefined();
    });
  });

  describe('Scenario 3 — HARD_REQUIRE + conflicting self-fact → excluded', () => {
    it('excludes non-smoker when searcher says "only smokers"', async () => {
      const { searcherCookie, searcherProfileId, counterpartyProfileId } =
        await setupPair({
          key: 'db3',
          searcherAboutPartner: 'Only smokers',
          counterpartyAboutMe: "I don't smoke and I run marathons",
        });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.viewerProfileId).toBe(searcherProfileId);
      expect(findMatch(res.body.matches, counterpartyProfileId)).toBeUndefined();
    });
  });

  describe('Scenario 4 — SOFT + smoker → included (no eligibility effect)', () => {
    it('includes smoker when searcher says "don\'t care about smoking"', async () => {
      const { searcherCookie, searcherProfileId, counterpartyProfileId } =
        await setupPair({
          key: 'db4',
          searcherAboutPartner: "I don't care about smoking",
          counterpartyAboutMe: 'I smoke socially on weekends',
        });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.viewerProfileId).toBe(searcherProfileId);
      expect(findMatch(res.body.matches, counterpartyProfileId)).toBeDefined();
    });
  });
});
