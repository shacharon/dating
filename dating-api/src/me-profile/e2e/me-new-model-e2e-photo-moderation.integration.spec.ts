/**
 * Sprint 19 Story 2 — photo moderation visibility (integration).
 *
 * Proves GET /api/v1/me/matches photo-gate + candidate pool only treat
 * APPROVED photos as eligible. PENDING / FLAGGED_FOR_REVIEW / REJECTED do not
 * satisfy the gate or appear in the match list.
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e-photo-moderation.integration" --runInBand
 */

import {
  EligibilityTestHarness,
  makeEvalJson,
  makeIdentity,
} from '../matches/support/me-matches-eligibility.spec-support';

describe('Photo moderation visibility (integration)', () => {
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
    expect(submitRes.status).toBe(202);

    harness.markAnalyzed(profileId, evaluationJson);
    return profileId;
  }

  const signals = {
    ambition: 0.6,
    socialBattery: 0.5,
    emotionalDepth: 0.7,
    attachmentSecurity: 0.6,
  };

  it('viewer with only PENDING photo → matches not_ready / no_photo', async () => {
    const viewer = makeIdentity('pm-pending-viewer');
    const cookie = await harness.signupAndLogin(viewer);
    const profileId = await createSubmitAnalyze(
      cookie,
      {
        aboutMe: 'Pending photo viewer',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'FEMALE',
      },
      makeEvalJson(signals),
    );

    harness.setPhotos(profileId, [{ status: 'PENDING' }]);

    const res = await harness.getMatches(cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'not_ready',
      reason: 'no_photo',
    });
  });

  it('viewer with only FLAGGED_FOR_REVIEW photo → matches not_ready / no_photo', async () => {
    const viewer = makeIdentity('pm-flagged-viewer');
    const cookie = await harness.signupAndLogin(viewer);
    const profileId = await createSubmitAnalyze(
      cookie,
      {
        aboutMe: 'Flagged photo viewer',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'FEMALE',
      },
      makeEvalJson(signals),
    );

    harness.setPhotos(profileId, [{ status: 'FLAGGED_FOR_REVIEW' }]);

    const res = await harness.getMatches(cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'not_ready',
      reason: 'no_photo',
    });
  });

  it('candidate with only REJECTED / FLAGGED / PENDING photos is excluded from pool', async () => {
    const viewerId = makeIdentity('pm-pool-viewer');
    const okId = makeIdentity('pm-pool-ok');
    const rejectedId = makeIdentity('pm-pool-rejected');
    const flaggedId = makeIdentity('pm-pool-flagged');
    const pendingId = makeIdentity('pm-pool-pending');

    const viewerCookie = await harness.signupAndLogin(viewerId);
    const okCookie = await harness.signupAndLogin(okId);
    const rejectedCookie = await harness.signupAndLogin(rejectedId);
    const flaggedCookie = await harness.signupAndLogin(flaggedId);
    const pendingCookie = await harness.signupAndLogin(pendingId);

    const viewerProfileId = await createSubmitAnalyze(
      viewerCookie,
      {
        aboutMe: 'Pool viewer',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'FEMALE',
      },
      makeEvalJson(signals),
    );

    const okProfileId = await createSubmitAnalyze(
      okCookie,
      {
        aboutMe: 'Approved candidate',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'MALE',
      },
      makeEvalJson(signals),
    );

    const rejectedProfileId = await createSubmitAnalyze(
      rejectedCookie,
      {
        aboutMe: 'Rejected candidate',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'MALE',
      },
      makeEvalJson(signals),
    );
    harness.setPhotos(rejectedProfileId, [{ status: 'REJECTED' }]);

    const flaggedProfileId = await createSubmitAnalyze(
      flaggedCookie,
      {
        aboutMe: 'Flagged candidate',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'MALE',
      },
      makeEvalJson(signals),
    );
    harness.setPhotos(flaggedProfileId, [{ status: 'FLAGGED_FOR_REVIEW' }]);

    const pendingProfileId = await createSubmitAnalyze(
      pendingCookie,
      {
        aboutMe: 'Pending candidate',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'MALE',
      },
      makeEvalJson(signals),
    );
    harness.setPhotos(pendingProfileId, [{ status: 'PENDING' }]);

    const res = await harness.getMatches(viewerCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.viewerProfileId).toBe(viewerProfileId);

    const ids = (res.body.matches as Array<{ id: string }>).map((m) => m.id);
    expect(ids).toContain(okProfileId);
    expect(ids).not.toContain(rejectedProfileId);
    expect(ids).not.toContain(flaggedProfileId);
    expect(ids).not.toContain(pendingProfileId);
  });

  it('after setPhotos APPROVED, viewer becomes ready and candidate appears', async () => {
    const viewer = makeIdentity('pm-approve-viewer');
    const candidate = makeIdentity('pm-approve-cand');
    const viewerCookie = await harness.signupAndLogin(viewer);
    const candCookie = await harness.signupAndLogin(candidate);

    const viewerProfileId = await createSubmitAnalyze(
      viewerCookie,
      {
        aboutMe: 'Approve flow viewer',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'FEMALE',
      },
      makeEvalJson(signals),
    );
    harness.setPhotos(viewerProfileId, [{ status: 'FLAGGED_FOR_REVIEW' }]);

    const candProfileId = await createSubmitAnalyze(
      candCookie,
      {
        aboutMe: 'Approve flow candidate',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'MALE',
      },
      makeEvalJson(signals),
    );
    harness.setPhotos(candProfileId, [{ status: 'PENDING' }]);

    const blocked = await harness.getMatches(viewerCookie);
    expect(blocked.body).toMatchObject({
      status: 'not_ready',
      reason: 'no_photo',
    });

    // Simulate human/ML approve on both sides.
    harness.setPhotos(viewerProfileId, [{ status: 'APPROVED', isPrimary: true }]);
    harness.setPhotos(candProfileId, [{ status: 'APPROVED', isPrimary: true }]);

    const ready = await harness.getMatches(viewerCookie);
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('ready');
    const ids = (ready.body.matches as Array<{ id: string }>).map((m) => m.id);
    expect(ids).toContain(candProfileId);
  });
});
