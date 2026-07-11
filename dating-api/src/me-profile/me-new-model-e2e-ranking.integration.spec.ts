/**
 * Sprint 16/17 regression baseline — multi-candidate ranking order (integration).
 *
 * Characterizes the CURRENT `GET /api/v1/me/matches` ranking order contract before Sprint 16's
 * `UNKNOWN`-status strictness-control work and Sprint 17's dealbreaker-classifier work begin.
 * Sprint 16 must keep this test green unmodified (pure internal refactor); Sprint 17 will add new
 * passing scenarios without breaking it.
 *
 * Empirically confirmed by reading `me-matches.service.ts::list` (not assumed): candidates are
 * sorted by `matchScore` **descending** (`matches.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1))`),
 * with null scores sorting last. `holy-grail-five-signal-ranking.ts` (Layer-4 "five-signal" ranking)
 * is a separate, currently-unused-by-this-endpoint ranking model — it is not imported by
 * `MeMatchesService` and does not influence `/api/v1/me/matches` order today.
 *
 * Harness: same in-memory-Prisma / real-HTTP pattern as `me-new-model-e2e-eligibility.integration.spec.ts`,
 * via the shared `EligibilityTestHarness` (`me-matches-eligibility-harness.ts`).
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e-ranking.integration" --runInBand
 */

import {
  EligibilityTestHarness,
  makeEvalJson,
  makeIdentity,
} from './me-matches-eligibility-harness';

describe('Match ranking order regression baseline (integration)', () => {
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
    evaluationJson: unknown,
  ): Promise<string> {
    const createRes = await harness.createProfile(cookie, body);
    expect(createRes.status).toBe(201);
    const profileId: string = createRes.body.id;

    const submitRes = await harness.submitProfile(cookie);
    expect(submitRes.status).toBe(200);

    harness.markAnalyzed(profileId, evaluationJson);
    return profileId;
  }

  it('returns three mutually-eligible candidates ordered by matchScore descending', async () => {
    const viewerIdentity = makeIdentity('rank-viewer');
    const closeIdentity = makeIdentity('rank-close');
    const midIdentity = makeIdentity('rank-mid');
    const farIdentity = makeIdentity('rank-far');

    const viewerCookie = await harness.signupAndLogin(viewerIdentity);
    const closeCookie = await harness.signupAndLogin(closeIdentity);
    const midCookie = await harness.signupAndLogin(midIdentity);
    const farCookie = await harness.signupAndLogin(farIdentity);

    // No gender/age preference on any side — all three candidates are mutually HG-eligible
    // (GENDER/AGE both SKIPPED); only the engine's self-signal similarity score differentiates
    // them, isolating this test to ranking order only.
    const viewerSignals = {
      ambition: 0.6,
      socialBattery: 0.5,
      emotionalDepth: 0.7,
      attachmentSecurity: 0.6,
    };

    const viewerProfileId = await createSubmitAnalyze(
      viewerCookie,
      {
        aboutMe: 'Grounded and curious',
        aboutPartner: 'Someone kind and steady',
        aboutRelationship: 'Looking for a long-term partner',
        gender: 'FEMALE',
      },
      makeEvalJson(viewerSignals),
    );

    // "close": self-signals identical to the viewer — expected highest similarity/score.
    const closeProfileId = await createSubmitAnalyze(
      closeCookie,
      {
        aboutMe: 'Grounded and curious too',
        aboutPartner: 'Someone kind and steady',
        aboutRelationship: 'Looking for a long-term partner',
        gender: 'MALE',
      },
      makeEvalJson({ ...viewerSignals }),
    );

    // "mid": moderately different self-signals.
    const midProfileId = await createSubmitAnalyze(
      midCookie,
      {
        aboutMe: 'Easygoing and social',
        aboutPartner: 'Someone genuine',
        aboutRelationship: 'Open to something serious',
        gender: 'MALE',
      },
      makeEvalJson({
        ambition: 0.35,
        socialBattery: 0.6,
        emotionalDepth: 0.45,
        attachmentSecurity: 0.5,
      }),
    );

    // "far": strongly divergent self-signals — expected lowest similarity/score.
    const farProfileId = await createSubmitAnalyze(
      farCookie,
      {
        aboutMe: 'Spontaneous free spirit',
        aboutPartner: 'Someone adventurous',
        aboutRelationship: 'Not looking for anything serious',
        gender: 'MALE',
      },
      makeEvalJson({
        ambition: 0.05,
        socialBattery: 0.95,
        emotionalDepth: 0.05,
        attachmentSecurity: 0.1,
      }),
    );

    const res = await harness.getMatches(viewerCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.viewerProfileId).toBe(viewerProfileId);

    const ids = [closeProfileId, midProfileId, farProfileId];
    const matches = res.body.matches.filter((m: { id: string }) => ids.includes(m.id));
    expect(matches).toHaveLength(3);

    // Ranking order contract, verified empirically against the running engine (not assumed):
    // matchScore descending, ties broken however `Array.prototype.sort` naturally resolves them.
    for (let i = 0; i + 1 < matches.length; i++) {
      expect(matches[i].matchScore).toBeGreaterThanOrEqual(matches[i + 1].matchScore);
    }

    // Identity-level ordering: the profile with self-signals identical to the viewer's ranks
    // first, and the profile with the most divergent self-signals ranks last.
    expect(matches[0].id).toBe(closeProfileId);
    expect(matches[matches.length - 1].id).toBe(farProfileId);
    expect(matches.find((m: { id: string }) => m.id === midProfileId)).toBeDefined();
  });
});
