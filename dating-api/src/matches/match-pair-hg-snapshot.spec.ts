import type { MatchPairHgSnapshot } from '@prisma/client';
import {
  PartnerWantsChildrenRequirement,
  WantsChildrenSelf,
  MATCHING_CANONICAL_MODEL_VERSION,
} from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { evaluateHolyGrailDirectional } from '../holy-grail-matching/eligibility.evaluator';
import { HG_LIST_PRODUCT_POLICY_VERSION } from './children-unsure.product-policy';
import {
  buildPairHgSnapshotPayload,
  resolveChildrenUnsureForPair,
  tryChildrenUnsureFromSnapshotRow,
  upsertMatchPairHgSnapshots,
} from './match-pair-hg-snapshot';
import type { MatchRecordDto } from './match.types';

const AT = new Date('2020-06-15T12:00:00.000Z');

function model(
  profileId: string,
  partial: Pick<MatchingCanonicalModel, 'facts' | 'preferences' | 'searchOverrides'>,
): MatchingCanonicalModel {
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: partial.facts ?? {},
    preferences: partial.preferences ?? {},
    searchOverrides: partial.searchOverrides ?? {},
  };
}

describe('match_pair_hg_snapshot', () => {
  it('round-trips children directions via hgChildrenStatus + policy version', () => {
    const a = model('a', {
      preferences: { partnerWantsChildren: PartnerWantsChildrenRequirement.MUST_WANT },
      facts: { wantsChildren: WantsChildrenSelf.YES },
    });
    const b = model('b', {
      facts: { wantsChildren: WantsChildrenSelf.UNSURE },
    });
    const aToB = evaluateHolyGrailDirectional({ searcher: a, counterparty: b, evaluatedAt: AT });
    const bToA = evaluateHolyGrailDirectional({ searcher: b, counterparty: a, evaluatedAt: AT });

    const payload = buildPairHgSnapshotPayload('a__b', aToB, bToA);
    expect(payload.hgPolicyVersion).toBe(HG_LIST_PRODUCT_POLICY_VERSION);
    expect(payload.childrenUnsure).toBe(true);
    expect(payload.hgRankPenaltyApplied).toBe(true);

    const row = {
      matchId: payload.matchId,
      childrenUnsure: payload.childrenUnsure,
      hgChildrenStatus: payload.hgChildrenStatus,
      hgOverallStatus: payload.hgOverallStatus,
      hgSoftPassCount: payload.hgSoftPassCount,
      hgRankPenaltyApplied: payload.hgRankPenaltyApplied,
      hgPolicyVersion: payload.hgPolicyVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MatchPairHgSnapshot;

    expect(tryChildrenUnsureFromSnapshotRow(row)).toEqual({
      profile_a_to_profile_b: true,
      profile_b_to_profile_a: false,
    });
  });

  it('tryChildrenUnsureFromSnapshotRow returns null for wrong policy version', () => {
    const row = {
      hgPolicyVersion: 'old',
      hgChildrenStatus: 'SOFT_PASS:SKIPPED',
    } as MatchPairHgSnapshot;
    expect(tryChildrenUnsureFromSnapshotRow(row)).toBeNull();
  });

  it('tryChildrenUnsureFromSnapshotRow returns null for malformed status', () => {
    const row = {
      hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
      hgChildrenStatus: 'nope',
    } as MatchPairHgSnapshot;
    expect(tryChildrenUnsureFromSnapshotRow(row)).toBeNull();
  });

  it('resolveChildrenUnsureForPair prefers snapshot over live when snapshot parses', () => {
    const snap = {
      hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
      hgChildrenStatus: 'PASS:SOFT_PASS',
    } as MatchPairHgSnapshot;
    const out = resolveChildrenUnsureForPair({
      snapshot: snap,
      rowA: undefined,
      rowB: undefined,
    });
    expect(out).toEqual({
      profile_a_to_profile_b: false,
      profile_b_to_profile_a: true,
    });
  });

  it('resolveChildrenUnsureForPair falls back when snapshot absent', () => {
    const out = resolveChildrenUnsureForPair({
      snapshot: null,
      rowA: undefined,
      rowB: undefined,
    });
    expect(out).toEqual({
      profile_a_to_profile_b: false,
      profile_b_to_profile_a: false,
    });
  });

  it('upsertMatchPairHgSnapshots calls upsert per payload', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = {
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      matchPairHgSnapshot: { upsert },
    } as unknown as import('../prisma/prisma.service').PrismaService;

    const records: MatchRecordDto[] = [
      {
        matchId: 'a__b',
        aId: 'a',
        bId: 'b',
        a: { id: 'a', name: 'A' },
        b: { id: 'b', name: 'B' },
        overall: 80,
        createdAt: '',
        updatedAt: '',
        aToB: 0,
        bToA: 0,
        relationshipStyle: 0,
        coverage: 0,
        frictionRisk: 0,
        alignments: [],
        tensions: [],
      },
    ];

    const profileMap = new Map();
    const { written, skipped } = await upsertMatchPairHgSnapshots(prisma, records, profileMap);
    expect(written).toBe(0);
    expect(skipped).toBe(1);
    expect(upsert).not.toHaveBeenCalled();

    profileMap.set('a', {
      id: 'a',
      holyGrailStructuredFacts: {},
      holyGrailStructuredPreferences: {},
      extractionV2: { interests_self: [], interests: [], lifestyleTraits: [] },
    });
    profileMap.set('b', {
      id: 'b',
      holyGrailStructuredFacts: {},
      holyGrailStructuredPreferences: {},
      extractionV2: { interests_self: [], interests: [], lifestyleTraits: [] },
    });

    upsert.mockClear();
    const r2 = await upsertMatchPairHgSnapshots(prisma, records, profileMap);
    expect(r2.written).toBe(1);
    expect(r2.skipped).toBe(0);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].where).toEqual({ matchId: 'a__b' });
  });
});
