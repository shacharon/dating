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
  classifyChildrenUnsureFromSnapshot,
  classifyHolyGrailDiagnosticsFromSnapshot,
  resolvePairHgFieldsFromSnapshotAndRows,
  upsertMatchPairHgSnapshots,
  type MatchPairHgSnapshotRow,
} from './match-pair-hg-snapshot';
import type { MatchRecordDto } from './match.types';
import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';

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
    } as MatchPairHgSnapshotRow;

    const ch = classifyChildrenUnsureFromSnapshot(row);
    expect(ch.ok).toBe(true);
    if (ch.ok) {
      expect(ch.dto).toEqual({
        profile_a_to_profile_b: true,
        profile_b_to_profile_a: false,
      });
    }

    const diag = classifyHolyGrailDiagnosticsFromSnapshot(row);
    expect(diag.ok).toBe(true);
    if (diag.ok) {
      expect(diag.dto.hgOverallStatus).toBe(payload.hgOverallStatus);
      expect(diag.dto.hgRankScore).toBe(payload.hgSoftPassCount);
      expect(typeof diag.dto.hgMutualPass).toBe('boolean');
    }
  });

  it('classifyChildrenUnsureFromSnapshot rejects wrong policy version', () => {
    const row = {
      hgPolicyVersion: 'old',
      hgChildrenStatus: 'SOFT_PASS:SKIPPED',
    } as MatchPairHgSnapshotRow;
    expect(classifyChildrenUnsureFromSnapshot(row).ok).toBe(false);
  });

  it('classifyChildrenUnsureFromSnapshot rejects malformed hgChildrenStatus', () => {
    const row = {
      hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
      hgChildrenStatus: 'nope',
    } as MatchPairHgSnapshotRow;
    expect(classifyChildrenUnsureFromSnapshot(row).ok).toBe(false);
  });

  it('resolvePairHgFieldsFromSnapshotAndRows children_unsure prefers snapshot when it parses', () => {
    const snap = {
      hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
      hgChildrenStatus: 'PASS:SOFT_PASS',
    } as MatchPairHgSnapshotRow;
    const out = resolvePairHgFieldsFromSnapshotAndRows({
      snapshot: snap,
      rowA: undefined,
      rowB: undefined,
    }).children_unsure;
    expect(out).toEqual({
      profile_a_to_profile_b: false,
      profile_b_to_profile_a: true,
    });
  });

  it('classifyHolyGrailDiagnosticsFromSnapshot rejects missing hgSoftPassCount', () => {
    const row = {
      hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
      hgOverallStatus: 'PASS:PASS',
      hgSoftPassCount: null,
    } as MatchPairHgSnapshotRow;
    expect(classifyHolyGrailDiagnosticsFromSnapshot(row).ok).toBe(false);
  });

  it('resolvePairHgFieldsFromSnapshotAndRows returns holyGrail from snapshot without profile rows', () => {
    const snap = {
      hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
      hgChildrenStatus: 'PASS:SOFT_PASS',
      hgOverallStatus: 'PASS:PASS',
      hgSoftPassCount: 2,
    } as MatchPairHgSnapshotRow;
    const out = resolvePairHgFieldsFromSnapshotAndRows({
      snapshot: snap,
      rowA: undefined,
      rowB: undefined,
    });
    expect(out.children_unsure).toEqual({
      profile_a_to_profile_b: false,
      profile_b_to_profile_a: true,
    });
    expect(out.holyGrail).toEqual({
      hgMutualPass: true,
      hgOverallStatus: 'PASS:PASS',
      hgRankScore: 2,
    });
    expect(out.telemetry).toMatchObject({
      childrenSource: 'snapshot',
      diagnosticsSource: 'snapshot',
      liveEvalRan: false,
      snapshotPolicyCurrent: true,
    });
  });

  it('resolvePairHgFieldsFromSnapshotAndRows defaults children_unsure when snapshot absent and no rows', () => {
    const out = resolvePairHgFieldsFromSnapshotAndRows({
      snapshot: null,
      rowA: undefined,
      rowB: undefined,
    }).children_unsure;
    expect(out).toEqual({
      profile_a_to_profile_b: false,
      profile_b_to_profile_a: false,
    });
  });

  it('upsertMatchPairHgSnapshots does not call Prisma (table removed, Migration 3)', async () => {
    const prisma = {} as unknown as import('../prisma/prisma.service').PrismaService;

    const records: MatchRecordDto[] = [
      {
        matchId: 'a__b',
        aId: 'a',
        bId: 'b',
        a: { id: 'a', name: 'A' },
        b: { id: 'b', name: 'B' },
        finalScore: 80,
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

    const profileMap = new Map<string, ChildrenUnsureProfileRow>();
    const { written, skipped } = await upsertMatchPairHgSnapshots(prisma, records, profileMap);
    expect(written).toBe(0);
    expect(skipped).toBe(1);

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

    const r2 = await upsertMatchPairHgSnapshots(prisma, records, profileMap);
    expect(r2.written).toBe(0);
    expect(r2.skipped).toBe(1);
  });
});
