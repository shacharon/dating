/**
 * Sprint 22 Story 2 — match narrative wire + evaluation-keyed cache E2E (integration).
 *
 * Proves real HTTP behavior for `GET /api/v1/me/matches` (list omits narrative) and
 * `GET /api/v1/me/matches/:id` (lazy narrative + cache hit / eval-id miss / no fallback cache).
 * Scoring / eligibility / ranking are unchanged — this suite only asserts narrative side effects.
 *
 * Harness: `me-matches-eligibility-harness.ts` (real Nest + HTTP, in-memory Prisma,
 * stubbed `MatchNarrativeGenerator`).
 *
 * Run:
 *   npx jest --no-coverage "me-new-model-e2e-match-narrative.integration" --runInBand
 */

import {
  EligibilityTestHarness,
  makeEvalJson,
  makeIdentity,
} from './me-matches-eligibility-harness';

describe('Match narrative wire + cache (Sprint 22 Story 2 integration)', () => {
  const harness = new EligibilityTestHarness();

  beforeAll(async () => {
    await harness.init();
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(() => {
    harness.clearNarrativeCache();
    harness.matchNarrativeGeneratorStub.generate.mockClear();
    harness.matchNarrativeGeneratorStub.generate.mockResolvedValue({
      narrative: 'Harness LLM narrative about shared emotional depth.',
      source: 'llm',
      promptVersion: 'v1',
    });
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

  async function setupCompatiblePair(key: string): Promise<{
    searcherCookie: string;
    searcherProfileId: string;
    counterpartyProfileId: string;
  }> {
    const searcher = makeIdentity(`${key}-searcher`);
    const counterparty = makeIdentity(`${key}-counterparty`);

    const searcherCookie = await harness.signupAndLogin(searcher);
    const counterpartyCookie = await harness.signupAndLogin(counterparty);

    const searcherProfileId = await createSubmitAnalyze(searcherCookie, {
      aboutMe: 'I enjoy hiking and coffee',
      aboutPartner: 'Someone kind and curious',
      aboutRelationship: 'Looking for a long-term relationship',
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'],
      birthDate: '1990-06-15',
    });

    const counterpartyProfileId = await createSubmitAnalyze(counterpartyCookie, {
      aboutMe: 'Into art and quiet evenings',
      aboutPartner: 'Someone grounded',
      aboutRelationship: 'Open to something serious',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
      birthDate: '1992-03-20',
    });

    return { searcherCookie, searcherProfileId, counterpartyProfileId };
  }

  it('list omits matchNarrative and does not call the generator', async () => {
    const { searcherCookie, counterpartyProfileId } =
      await setupCompatiblePair('narr-list');

    const res = await harness.getMatches(searcherCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');

    const row = res.body.matches.find(
      (m: { id: string }) => m.id === counterpartyProfileId,
    );
    expect(row).toBeDefined();
    expect(typeof row.matchScore).toBe('number');
    expect(Number.isFinite(row.matchScore)).toBe(true);
    expect(row).not.toHaveProperty('matchNarrative');
    expect(harness.matchNarrativeGeneratorStub.generate).not.toHaveBeenCalled();
  });

  it('detail returns matchNarrative; second open is a cache hit', async () => {
    const { searcherCookie, counterpartyProfileId } =
      await setupCompatiblePair('narr-hit');

    const first = await harness.getMatchById(
      searcherCookie,
      counterpartyProfileId,
    );
    expect(first.status).toBe(200);
    expect(typeof first.body.matchScore).toBe('number');
    expect(Number.isFinite(first.body.matchScore)).toBe(true);
    expect(first.body.matchNarrative).toBe(
      'Harness LLM narrative about shared emotional depth.',
    );
    expect(harness.matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);
    expect(harness.narrativeCachePrisma.store.size).toBe(1);

    const second = await harness.getMatchById(
      searcherCookie,
      counterpartyProfileId,
    );
    expect(second.status).toBe(200);
    expect(second.body.matchNarrative).toBe(
      'Harness LLM narrative about shared emotional depth.',
    );
    expect(harness.matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);
  });

  it('new candidate evaluation id forces cache miss and regenerates', async () => {
    const { searcherCookie, counterpartyProfileId } =
      await setupCompatiblePair('narr-eval');

    await harness.getMatchById(searcherCookie, counterpartyProfileId);
    expect(harness.matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);

    harness.remountEvaluation(counterpartyProfileId, {
      evaluationId: `eval_${counterpartyProfileId}_v2`,
    });

    await harness.getMatchById(searcherCookie, counterpartyProfileId);
    expect(harness.matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(2);
  });

  it('fallback narrative is returned but not cached', async () => {
    harness.matchNarrativeGeneratorStub.generate.mockResolvedValue({
      narrative: 'Deterministic fallback narrative for E2E.',
      source: 'fallback',
      promptVersion: 'v1',
    });

    const { searcherCookie, counterpartyProfileId } =
      await setupCompatiblePair('narr-fallback');

    const first = await harness.getMatchById(
      searcherCookie,
      counterpartyProfileId,
    );
    expect(first.status).toBe(200);
    expect(first.body.matchNarrative).toBe(
      'Deterministic fallback narrative for E2E.',
    );
    expect(harness.narrativeCachePrisma.store.size).toBe(0);

    await harness.getMatchById(searcherCookie, counterpartyProfileId);
    expect(harness.matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(2);
  });
});
