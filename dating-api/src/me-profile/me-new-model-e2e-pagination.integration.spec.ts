/**
 * Sprint 19 Story 1 — match list cursor pagination (integration).
 *
 * Proves page1 + page2 + … concatenation equals the full ranked list order
 * (score DESC), with no duplicates or gaps — via real HTTP + shared harness.
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e-pagination.integration" --runInBand
 */

import {
  EligibilityTestHarness,
  makeEvalJson,
  makeIdentity,
} from './me-matches-eligibility.spec-support';

describe('Match list cursor pagination (integration)', () => {
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

  it('paginates ranked matches without duplicates or order drift', async () => {
    const viewerIdentity = makeIdentity('page-viewer');
    const viewerCookie = await harness.signupAndLogin(viewerIdentity);

    const viewerSignals = {
      ambition: 0.6,
      socialBattery: 0.5,
      emotionalDepth: 0.7,
      attachmentSecurity: 0.6,
    };

    const viewerProfileId = await createSubmitAnalyze(
      viewerCookie,
      {
        aboutMe: 'Pagination viewer',
        aboutPartner: 'Someone kind',
        aboutRelationship: 'Long-term',
        gender: 'FEMALE',
      },
      makeEvalJson(viewerSignals),
    );

    // Five mutually eligible males with decreasing signal similarity → stable score DESC.
    const candidateSpecs: Array<{
      key: string;
      signals: Record<string, number>;
    }> = [
      {
        key: 'page-c1',
        signals: { ...viewerSignals },
      },
      {
        key: 'page-c2',
        signals: {
          ambition: 0.5,
          socialBattery: 0.55,
          emotionalDepth: 0.6,
          attachmentSecurity: 0.55,
        },
      },
      {
        key: 'page-c3',
        signals: {
          ambition: 0.4,
          socialBattery: 0.6,
          emotionalDepth: 0.5,
          attachmentSecurity: 0.5,
        },
      },
      {
        key: 'page-c4',
        signals: {
          ambition: 0.25,
          socialBattery: 0.7,
          emotionalDepth: 0.35,
          attachmentSecurity: 0.4,
        },
      },
      {
        key: 'page-c5',
        signals: {
          ambition: 0.05,
          socialBattery: 0.95,
          emotionalDepth: 0.05,
          attachmentSecurity: 0.1,
        },
      },
    ];

    const candidateIds: string[] = [];
    for (const spec of candidateSpecs) {
      const cookie = await harness.signupAndLogin(makeIdentity(spec.key));
      const id = await createSubmitAnalyze(
        cookie,
        {
          aboutMe: `Candidate ${spec.key}`,
          aboutPartner: 'Someone genuine',
          aboutRelationship: 'Open to something serious',
          gender: 'MALE',
        },
        makeEvalJson(spec.signals),
      );
      candidateIds.push(id);
    }

    const fullRes = await harness.getMatches(viewerCookie, { limit: 50 });
    expect(fullRes.status).toBe(200);
    expect(fullRes.body.status).toBe('ready');
    expect(fullRes.body.viewerProfileId).toBe(viewerProfileId);

    const fullMatches = (fullRes.body.matches as Array<{ id: string }>).filter(
      (m) => candidateIds.includes(m.id),
    );
    expect(fullMatches.length).toBe(5);
    const fullOrder = fullMatches.map((m) => m.id);

    // Walk pages of size 2 until exhausted.
    const collected: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    for (;;) {
      pages += 1;
      expect(pages).toBeLessThanOrEqual(5);
      const res = await harness.getMatches(viewerCookie, {
        limit: 2,
        cursor,
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      const pageIds = (
        (res.body.matches as Array<{ id: string }>) ?? []
      )
        .map((m) => m.id)
        .filter((id) => candidateIds.includes(id));
      collected.push(...pageIds);

      if (!res.body.hasMore || !res.body.nextCursor) {
        break;
      }
      cursor = res.body.nextCursor as string;
    }

    // Only our five candidates matter for order equality (other harness leftovers may exist).
    const collectedOurs = collected.filter((id) => candidateIds.includes(id));
    expect(collectedOurs).toEqual(fullOrder);
    expect(new Set(collectedOurs).size).toBe(collectedOurs.length);
  });
});
