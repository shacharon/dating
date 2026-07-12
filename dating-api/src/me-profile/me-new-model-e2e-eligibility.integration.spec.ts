/**
 * Sprint 16/17 regression baseline — Holy Grail hard-eligibility characterization (integration).
 *
 * This suite characterizes CURRENT `GET /api/v1/me/matches` eligibility behavior — specifically
 * the GENDER and AGE dimensions of `evalGender` / `evalAge` in
 * `holy-grail-matching/eligibility.evaluator.ts` — **before** Sprint 16's `UNKNOWN`-status
 * strictness-control work and Sprint 17's natural-language dealbreaker classifier begin.
 *
 * Contract for future sprints:
 *  - Sprint 16 (`docs/sprints/sprint-16-matching-strictness-control/`) must keep every one of these
 *    tests green **unmodified** — it is scoped as a pure internal refactor (introducing an `UNKNOWN`
 *    eligibility status alongside `PASS`/`FAIL`/`SKIPPED`) that preserves net blocking behavior.
 *    If any assertion here needs to change to keep the suite green, Sprint 16 Story 1 broke its own
 *    zero-regression contract.
 *  - Sprint 17 (`docs/sprints/sprint-17-natural-language-dealbreaker-classifier/`) will intentionally
 *    *add* new passing scenarios (classifier-derived dealbreakers) without breaking any test below.
 *
 * Harness: real Nest app boot + real HTTP via supertest, `PrismaService` replaced by an in-memory
 * mock (`EligibilityTestHarness`, extracted to `me-matches-eligibility-harness.ts` — same pattern as
 * `me-new-model-e2e.integration.spec.ts`, generalized to N profiles). Partner preferences
 * (`desiredPartnerGenders` / `partnerAgeMin` / `partnerAgeMax`) are set through the real
 * `POST`/`PATCH /api/v1/me/profile` HTTP path — never poked directly into mock state.
 *
 * Empirically confirmed current behavior this suite locks in (see `me-matches.service.ts::list`):
 *  - A candidate whose reciprocal gender check fails, OR whose HG Layer-3 hard eligibility is FAIL
 *    in either direction, is `continue`d over — i.e. **excluded entirely** from the `matches` array
 *    (not included with an ineligible/flag marker).
 *  - The gender dimension is actually gated *twice* in production: once by a simple reciprocal
 *    JSON-based check (`reciprocalProductGenderEligibility`, using the same
 *    `UserProfilePreference.acceptedPartnerGenders` value) *before* the HG evaluator ever runs, and
 *    again inside HG's `evalGender`. Because both read the same underlying preference value, the
 *    simple gate always fires first for gender exclusions on this endpoint — `evalGender`'s FAIL
 *    branch, while fully implemented and unit-tested in isolation, is not reachable via this
 *    specific endpoint today. Net behavior (exclusion) is identical either way, which is what these
 *    tests lock in.
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e-eligibility.integration" --runInBand
 */

import {
  EligibilityTestHarness,
  makeEvalJson,
  makeIdentity,
} from './me-matches-eligibility-harness';

describe('Holy Grail eligibility regression baseline (integration)', () => {
  const harness = new EligibilityTestHarness();

  beforeAll(async () => {
    await harness.init();
  });

  afterAll(async () => {
    await harness.close();
  });

  /** create → submit → simulate ANALYZED for one identity; returns its UserProfile.id. */
  async function createSubmitAnalyze(
    cookie: string,
    body: Record<string, unknown>,
    evalJson = makeEvalJson({
      ambition: 0.6,
      socialBattery: 0.5,
      emotionalDepth: 0.7,
      attachmentSecurity: 0.6,
    }),
  ): Promise<string> {
    const createRes = await harness.createProfile(cookie, body);
    expect(createRes.status).toBe(201);
    const profileId: string = createRes.body.id;

    const submitRes = await harness.submitProfile(cookie);
    expect(submitRes.status).toBe(202);

    harness.markAnalyzed(profileId, evalJson);
    return profileId;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Scenario 1 — Gender exclusion, current behavior locked in
  // ═══════════════════════════════════════════════════════════════════

  describe('Scenario 1 — gender exclusion', () => {
    it('excludes a MALE counterparty when the searcher only accepts FEMALE', async () => {
      const searcher = makeIdentity('g1-searcher');
      const counterparty = makeIdentity('g1-counterparty');

      const searcherCookie = await harness.signupAndLogin(searcher);
      const counterpartyCookie = await harness.signupAndLogin(counterparty);

      const searcherProfileId = await createSubmitAnalyze(searcherCookie, {
        aboutMe: 'I love hiking and meaningful conversations',
        aboutPartner: 'Kind, curious, emotionally available',
        aboutRelationship: 'Looking for a long-term relationship',
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
      });
      const counterpartyProfileId = await createSubmitAnalyze(counterpartyCookie, {
        aboutMe: 'Into music and travel',
        aboutPartner: 'Someone grounded',
        aboutRelationship: 'Open to something serious',
        gender: 'MALE',
      });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.viewerProfileId).toBe(searcherProfileId);

      const match = res.body.matches.find(
        (m: { id: string }) => m.id === counterpartyProfileId,
      );
      expect(match).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Scenario 2 — Age range exclusion, current behavior locked in
  // ═══════════════════════════════════════════════════════════════════

  describe('Scenario 2 — age range exclusion', () => {
    it('excludes a counterparty whose age is below the searcher partnerAgeMin', async () => {
      const searcher = makeIdentity('g2-searcher');
      const counterparty = makeIdentity('g2-counterparty');

      const searcherCookie = await harness.signupAndLogin(searcher);
      const counterpartyCookie = await harness.signupAndLogin(counterparty);

      const createRes = await harness.createProfile(searcherCookie, {
        aboutMe: 'Enjoys reading and cooking',
        aboutPartner: 'Someone thoughtful',
        aboutRelationship: 'Long-term partnership',
        gender: 'FEMALE',
      });
      expect(createRes.status).toBe(201);
      const searcherProfileId: string = createRes.body.id;

      // Real production preference-setting path: PATCH /api/v1/me/profile with
      // partnerAgeMin/partnerAgeMax → MeProfileService.upsertPreference dual-writes
      // UserProfilePreference inside the same transaction as the profile write.
      const patchRes = await harness.patchProfile(searcherCookie, {
        partnerAgeMin: 25,
        partnerAgeMax: 40,
      });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.partnerAgeMin).toBe(25);
      expect(patchRes.body.partnerAgeMax).toBe(40);

      const submitRes = await harness.submitProfile(searcherCookie);
      expect(submitRes.status).toBe(202);
      harness.markAnalyzed(searcherProfileId);

      // No age (or gender) preference set on the counterparty's side — isolates the
      // exclusion to the AGE dimension only.
      const counterpartyProfileId = await createSubmitAnalyze(counterpartyCookie, {
        aboutMe: 'Loves the outdoors',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Serious relationship',
        gender: 'MALE',
        birthDate: '2016-01-01', // clearly below partnerAgeMin=25 regardless of "today"
      });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);

      const match = res.body.matches.find(
        (m: { id: string }) => m.id === counterpartyProfileId,
      );
      expect(match).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Scenario 3 — Missing counterparty DOB with an age preference set
  // ═══════════════════════════════════════════════════════════════════

  describe('Scenario 3 — missing counterparty DOB (PARTNER_DOB_MISSING)', () => {
    it('excludes a counterparty with no birthDate when the searcher has an age preference', async () => {
      const searcher = makeIdentity('g3-searcher');
      const counterparty = makeIdentity('g3-counterparty');

      const searcherCookie = await harness.signupAndLogin(searcher);
      const counterpartyCookie = await harness.signupAndLogin(counterparty);

      const createRes = await harness.createProfile(searcherCookie, {
        aboutMe: 'Enjoys quiet weekends',
        aboutPartner: 'Someone steady',
        aboutRelationship: 'Long-term',
        gender: 'FEMALE',
      });
      expect(createRes.status).toBe(201);
      const searcherProfileId: string = createRes.body.id;

      const patchRes = await harness.patchProfile(searcherCookie, {
        partnerAgeMin: 25,
        partnerAgeMax: 40,
      });
      expect(patchRes.status).toBe(200);

      const submitRes = await harness.submitProfile(searcherCookie);
      expect(submitRes.status).toBe(202);
      harness.markAnalyzed(searcherProfileId);

      // Counterparty never supplies a birthDate at all — the exact gap the existing
      // me-new-model-e2e.integration.spec.ts flow never exercised.
      const counterpartyProfileId = await createSubmitAnalyze(counterpartyCookie, {
        aboutMe: 'Works in design',
        aboutPartner: 'Someone curious',
        aboutRelationship: 'Open to long-term',
        gender: 'MALE',
        // birthDate intentionally omitted
      });

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);

      // Post Sprint 16 Story 1: raw status is UNKNOWN (PARTNER_DOB_MISSING), then
      // BLOCKS_ON_UNKNOWN → overallHardEligibility FAIL → still excluded from matches.
      // Assertion unchanged — zero HTTP behavior change contract.
      const match = res.body.matches.find(
        (m: { id: string }) => m.id === counterpartyProfileId,
      );
      expect(match).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Scenario 4 — Missing/withheld counterparty gender with a gender preference set
  // ═══════════════════════════════════════════════════════════════════

  describe('Scenario 4 — missing/withheld counterparty gender (PARTNER_GENDER_MISSING_OR_WITHHELD)', () => {
    it('excludes a counterparty who withholds gender when the searcher has a gender preference', async () => {
      const searcher = makeIdentity('g4-searcher');
      const counterparty = makeIdentity('g4-counterparty');

      const searcherCookie = await harness.signupAndLogin(searcher);
      const counterpartyCookie = await harness.signupAndLogin(counterparty);

      const searcherProfileId = await createSubmitAnalyze(searcherCookie, {
        aboutMe: 'Loves live music',
        aboutPartner: 'Someone warm',
        aboutRelationship: 'Long-term relationship',
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
      });

      // Counterparty must submit with a real gender (submit rejects gender=PREFER_NOT_TO_SAY /
      // unset with 422 `gender_required`) — there is no way to reach ANALYZED status with a
      // withheld gender via the submit path itself. So: submit normally with a valid gender,
      // then withhold it afterwards via a real PATCH — e.g. modeling a user who filled in their
      // gender, got analyzed, and later cleared/withdrew that answer.
      const counterpartyProfileId = await createSubmitAnalyze(counterpartyCookie, {
        aboutMe: 'Works in tech',
        aboutPartner: 'Someone patient',
        aboutRelationship: 'Serious relationship',
        gender: 'FEMALE',
      });
      const patchRes = await harness.patchProfile(counterpartyCookie, { gender: null });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.gender).toBe('PREFER_NOT_TO_SAY');

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.viewerProfileId).toBe(searcherProfileId);

      // Post Sprint 16 Story 1: raw UNKNOWN (PARTNER_GENDER_MISSING_OR_WITHHELD) +
      // BLOCKS_ON_UNKNOWN → overall FAIL → still excluded. Assertion unchanged.
      const match = res.body.matches.find(
        (m: { id: string }) => m.id === counterpartyProfileId,
      );
      expect(match).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Scenario 5 — No preference set at all (contrast case)
  // ═══════════════════════════════════════════════════════════════════

  describe('Scenario 5 — no preference set: missing gender + missing DOB are both SKIPPED, not FAIL', () => {
    it('includes a counterparty with missing gender AND missing DOB when the searcher set no preferences', async () => {
      const searcher = makeIdentity('g5-searcher');
      const counterparty = makeIdentity('g5-counterparty');

      const searcherCookie = await harness.signupAndLogin(searcher);
      const counterpartyCookie = await harness.signupAndLogin(counterparty);

      // Searcher sets no gender preference and no age preference at all.
      const searcherProfileId = await createSubmitAnalyze(searcherCookie, {
        aboutMe: 'Enjoys cycling',
        aboutPartner: 'Open-minded',
        aboutRelationship: 'Long-term',
        gender: 'FEMALE',
      });

      // Counterparty: submit with a valid gender + no birthDate, then withhold gender via
      // PATCH afterwards — same technique as Scenario 4, layered with Scenario 3's missing DOB,
      // to get both facts simultaneously missing at match-evaluation time.
      const counterpartyProfileId = await createSubmitAnalyze(counterpartyCookie, {
        aboutMe: 'Plays guitar',
        aboutPartner: 'Someone easygoing',
        aboutRelationship: 'Open to long-term',
        gender: 'MALE',
        // birthDate intentionally omitted
      });
      const patchRes = await harness.patchProfile(counterpartyCookie, { gender: null });
      expect(patchRes.status).toBe(200);

      const res = await harness.getMatches(searcherCookie);
      expect(res.status).toBe(200);
      expect(res.body.viewerProfileId).toBe(searcherProfileId);

      // CONTRAST with Scenarios 3/4: because the searcher never opted into a gender or age
      // preference, both GENDER and AGE dimensions evaluate to SKIPPED (never FAIL) — the
      // counterparty's missing facts are irrelevant when nothing constrains them. The
      // counterparty IS included.
      const match = res.body.matches.find(
        (m: { id: string }) => m.id === counterpartyProfileId,
      );
      expect(match).toBeDefined();
      expect(match.hasEvaluation).toBe(true);
    });
  });
});
