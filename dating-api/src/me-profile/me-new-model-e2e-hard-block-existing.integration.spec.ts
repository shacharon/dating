/**
 * Sprint 18 Story 1 — existing vs new hard-block visibility E2E (integration).
 *
 * Proves Liked / mutual hard-FAIL candidates stay on `GET /api/v1/me/matches`
 * with `hardBlocked`, while new hard-FAIL candidates remain omitted.
 *
 * Harness: `me-matches-eligibility-harness.ts` (real Nest + HTTP, in-memory Prisma).
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e-hard-block-existing.integration" --runInBand
 */

import {
  EligibilityTestHarness,
  makeEvalJson,
  makeIdentity,
} from './me-matches-eligibility-harness';

describe('Existing hard-block visibility (Sprint 18 Story 1 integration)', () => {
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

  async function setupPair(opts: {
    key: string;
    searcherAboutPartner: string;
    counterpartyAboutMe: string;
  }): Promise<{
    searcherCookie: string;
    searcherUserId: string;
    searcherProfileId: string;
    counterpartyCookie: string;
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

    return {
      searcherCookie,
      searcherUserId: searcher.id,
      searcherProfileId,
      counterpartyCookie,
      counterpartyProfileId,
    };
  }

  function findMatch<T extends { id: string }>(
    matches: T[],
    profileId: string,
  ): T | undefined {
    return matches.find((m) => m.id === profileId);
  }

  describe('Scenario A — new hard FAIL omitted after profile update', () => {
    it('includes silent counterparty, then omits after they say "I smoke" without LIKE', async () => {
      const {
        searcherCookie,
        searcherProfileId,
        counterpartyCookie,
        counterpartyProfileId,
      } = await setupPair({
        key: 'hbA',
        searcherAboutPartner: "I don't want smokers",
        counterpartyAboutMe: 'I love hiking and travel',
      });

      const before = await harness.getMatches(searcherCookie);
      expect(before.status).toBe(200);
      expect(before.body.status).toBe('ready');
      expect(before.body.viewerProfileId).toBe(searcherProfileId);
      expect(findMatch(before.body.matches, counterpartyProfileId)).toBeDefined();
      expect(
        findMatch(before.body.matches, counterpartyProfileId)?.hardBlocked,
      ).toBeUndefined();

      const patchRes = await harness.patchProfile(counterpartyCookie, {
        aboutMe: 'I smoke and love jazz',
      });
      expect(patchRes.status).toBe(200);

      const after = await harness.getMatches(searcherCookie);
      expect(after.status).toBe(200);
      expect(after.body.status).toBe('ready');
      expect(findMatch(after.body.matches, counterpartyProfileId)).toBeUndefined();
    });
  });

  describe('Scenario B — Liked then hard FAIL stays with hardBlocked', () => {
    it('keeps Liked candidate after they say "I smoke", with reasons + detail 200', async () => {
      const {
        searcherCookie,
        searcherProfileId,
        counterpartyCookie,
        counterpartyProfileId,
      } = await setupPair({
        key: 'hbB',
        searcherAboutPartner: "I don't want smokers",
        counterpartyAboutMe: 'I love hiking and travel',
      });

      const before = await harness.getMatches(searcherCookie);
      expect(findMatch(before.body.matches, counterpartyProfileId)).toBeDefined();

      const likeRes = await harness.postMatchAction(
        searcherCookie,
        counterpartyProfileId,
        'LIKE',
      );
      expect(likeRes.status).toBe(201);
      expect(likeRes.body.action).toBe('LIKE');

      const patchRes = await harness.patchProfile(counterpartyCookie, {
        aboutMe: 'I smoke and love jazz',
      });
      expect(patchRes.status).toBe(200);

      const after = await harness.getMatches(searcherCookie);
      expect(after.status).toBe(200);
      expect(after.body.viewerProfileId).toBe(searcherProfileId);
      const item = findMatch(after.body.matches, counterpartyProfileId);
      expect(item).toBeDefined();
      expect(item!.yourAction).toBe('LIKE');
      expect(item!.hardBlocked?.disabled).toBe(true);
      expect(item!.hardBlocked!.reasons.length).toBeGreaterThanOrEqual(1);
      expect(
        item!.hardBlocked!.reasons.some(
          (r: {
            dimension: string;
            direction: string;
            evidence?: { viewerQuote?: string; counterpartyQuote?: string };
          }) =>
            r.dimension === 'smoking' &&
            r.direction === 'viewer_to_them' &&
            r.evidence?.viewerQuote != null &&
            r.evidence?.counterpartyQuote != null,
        ),
      ).toBe(true);

      const detail = await harness.getMatchById(
        searcherCookie,
        counterpartyProfileId,
      );
      expect(detail.status).toBe(200);
      expect(detail.body.hardBlocked?.disabled).toBe(true);
      expect(
        detail.body.hardBlocked.reasons.some(
          (r: { dimension: string }) => r.dimension === 'smoking',
        ),
      ).toBe(true);
    });
  });

  describe('Scenario C — PASS-only hard FAIL still omitted; soft does not hard-block', () => {
    it('omits hard-FAIL candidate after PASS (not existing)', async () => {
      const {
        searcherCookie,
        counterpartyCookie,
        counterpartyProfileId,
      } = await setupPair({
        key: 'hbCpass',
        searcherAboutPartner: "I don't want smokers",
        counterpartyAboutMe: 'I love hiking and travel',
      });

      const passRes = await harness.postMatchAction(
        searcherCookie,
        counterpartyProfileId,
        'PASS',
      );
      expect(passRes.status).toBe(201);

      const patchRes = await harness.patchProfile(counterpartyCookie, {
        aboutMe: 'I smoke and love jazz',
      });
      expect(patchRes.status).toBe(200);

      const after = await harness.getMatches(searcherCookie);
      expect(findMatch(after.body.matches, counterpartyProfileId)).toBeUndefined();
    });

    it('includes smoker when searcher soft-prefers smoking (no hardBlocked)', async () => {
      const { searcherCookie, counterpartyProfileId } = await setupPair({
        key: 'hbCsoft',
        searcherAboutPartner: "I don't care about smoking",
        counterpartyAboutMe: 'I smoke socially on weekends',
      });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      const item = findMatch(res.body.matches, counterpartyProfileId);
      expect(item).toBeDefined();
      expect(item!.hardBlocked).toBeUndefined();
    });
  });
});
