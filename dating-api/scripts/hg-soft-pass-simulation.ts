/**
 * Read-only simulation: proposed SOFT_PASS matrices for AGE, ALCOHOL, RELIGION, PARTNER_WANTS_CHILDREN
 * against the same pool as hg-validation-report.ts. Does not change DB, schema, or production evaluators.
 *
 * Proposed rules (design-only; encoded here for reporting):
 * - AGE: ±δ years buffer outside [min,max] → SOFT_PASS (δ=2); inside → PASS; missing DOB / invalid → FAIL (unchanged).
 * - ALCOHOL (tightened / Option A): no SOFT_PASS — same outcomes as production baseline (PASS / FAIL / SKIPPED).
 * - RELIGION: allowlist match → PASS; missing/withheld fact → SOFT_PASS; [NONE]-only + JEWISH → SOFT_PASS;
 *   [NONE]-only + SPIRITUAL_NON_AFFILIATED | OTHER → SOFT_PASS; [NONE]-only + major listed faiths → FAIL; else FAIL.
 * - PARTNER_WANTS_CHILDREN (tightened): only MUST_WANT × UNSURE → SOFT_PASS; all other cases match baseline
 *   (including MUST_NOT_WANT × NOT_APPLICABLE → FAIL; missing / PREFER_NOT_TO_SAY → FAIL).
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import type { MatchingCanonicalModel, MatchingFacts, MatchingPreferences } from '../src/canonical/matching-canonical.types';
import {
  AcceptedPartnerAlcohol,
  AlcoholUseSelf,
  PartnerWantsChildrenRequirement,
  ReligionSelf,
  WantsChildrenSelf,
} from '../src/canonical/matching-canonical.types';
import { HOLY_GRAIL_DIMENSION_KEYS, type HolyGrailDimensionKey } from '../src/holy-grail-matching/holy-grail-dimensions';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import { evaluateHolyGrailDirectional } from '../src/holy-grail-matching/eligibility.evaluator';
import type { HolyGrailDirectionalEvaluationResult } from '../src/holy-grail-matching/eligibility.evaluator';
import { buildHolyGrailProfileMappingInputFromDbRow } from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';

const SYNTHETIC_ID_PREFIX_ALLOWLIST = ['synthetic-he-', 'synthetic-en-', 'synthetic-hg-gap-'] as const;
const VALIDATION_CANDIDATE_PREFIXES = SYNTHETIC_ID_PREFIX_ALLOWLIST;
const SOFT_PASS_DIMS = new Set<HolyGrailDimensionKey>(['AGE', 'ALCOHOL', 'RELIGION', 'PARTNER_WANTS_CHILDREN']);
const AGE_BUFFER_DELTA_YEARS = 2;

const OUTPUT_JSON = path.join(__dirname, '.hg-soft-pass-simulation-output.json');

type SimStatus = 'PASS' | 'SOFT_PASS' | 'FAIL' | 'SKIPPED';
type BaselineStatus = 'PASS' | 'FAIL' | 'SKIPPED' | 'SOFT_PASS';

interface SimDimEval {
  readonly status: SimStatus;
  readonly reasonCode: string;
}

function mergeEffectivePreferences(searcher: MatchingCanonicalModel): MatchingPreferences {
  const p = searcher.preferences;
  const o = searcher.searchOverrides;
  const e: MatchingPreferences = { ...p };
  if (o.acceptedPartnerGenders !== undefined) e.acceptedPartnerGenders = o.acceptedPartnerGenders;
  if (o.partnerAgeMin !== undefined) e.partnerAgeMin = o.partnerAgeMin;
  if (o.partnerAgeMax !== undefined) e.partnerAgeMax = o.partnerAgeMax;
  if (o.minimumPartnerEducation !== undefined) e.minimumPartnerEducation = o.minimumPartnerEducation;
  if (o.acceptedPartnerSmoking !== undefined) e.acceptedPartnerSmoking = o.acceptedPartnerSmoking;
  if (o.acceptedPartnerAlcohol !== undefined) e.acceptedPartnerAlcohol = o.acceptedPartnerAlcohol;
  if (o.partnerWantsChildren !== undefined) e.partnerWantsChildren = o.partnerWantsChildren;
  if (o.partnerHasChildren !== undefined) e.partnerHasChildren = o.partnerHasChildren;
  if (o.acceptedPartnerReligions !== undefined) e.acceptedPartnerReligions = o.acceptedPartnerReligions;
  if (o.maxDistanceKm !== undefined) e.maxDistanceKm = o.maxDistanceKm;
  return e;
}

function ageWholeYearsUtc(dateOfBirthYmd: string, ref: Date): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirthYmd);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ty = ref.getUTCFullYear();
  const tm = ref.getUTCMonth();
  const td = ref.getUTCDate();
  let age = ty - y;
  if (tm < mo - 1 || (tm === mo - 1 && td < d)) age -= 1;
  return age;
}

function simAge(pref: MatchingPreferences, facts: MatchingFacts, evaluatedAt: Date, delta: number): SimDimEval {
  const min = pref.partnerAgeMin;
  const max = pref.partnerAgeMax;
  if (min === undefined && max === undefined) {
    return { status: 'SKIPPED', reasonCode: 'AGE_PREF_ABSENT' };
  }
  const dob = facts.dateOfBirth;
  if (dob === undefined) {
    return { status: 'FAIL', reasonCode: 'PARTNER_DOB_MISSING' };
  }
  const age = ageWholeYearsUtc(dob, evaluatedAt);
  if (age === undefined) {
    return { status: 'FAIL', reasonCode: 'PARTNER_DOB_INVALID' };
  }
  if (min !== undefined && max !== undefined) {
    if (age >= min && age <= max) return { status: 'PASS', reasonCode: 'AGE_WITHIN_RANGE' };
    if (age >= min - delta && age < min) return { status: 'SOFT_PASS', reasonCode: 'SIM_AGE_BELOW_MIN_BUFFER' };
    if (age > max && age <= max + delta) return { status: 'SOFT_PASS', reasonCode: 'SIM_AGE_ABOVE_MAX_BUFFER' };
    if (age < min - delta) return { status: 'FAIL', reasonCode: 'AGE_BELOW_MIN' };
    return { status: 'FAIL', reasonCode: 'AGE_ABOVE_MAX' };
  }
  if (min !== undefined && max === undefined) {
    if (age >= min) return { status: 'PASS', reasonCode: 'AGE_WITHIN_RANGE' };
    if (age >= min - delta && age < min) return { status: 'SOFT_PASS', reasonCode: 'SIM_AGE_BELOW_MIN_BUFFER' };
    return { status: 'FAIL', reasonCode: 'AGE_BELOW_MIN' };
  }
  if (max !== undefined && min === undefined) {
    if (age <= max) return { status: 'PASS', reasonCode: 'AGE_WITHIN_RANGE' };
    if (age > max && age <= max + delta) return { status: 'SOFT_PASS', reasonCode: 'SIM_AGE_ABOVE_MAX_BUFFER' };
    return { status: 'FAIL', reasonCode: 'AGE_ABOVE_MAX' };
  }
  return { status: 'SKIPPED', reasonCode: 'AGE_PREF_ABSENT' };
}

/** Mirrors production alcohol matrix — no SOFT_PASS (Option A). */
function simAlcohol(pref: MatchingPreferences, facts: MatchingFacts): SimDimEval {
  const row = pref.acceptedPartnerAlcohol;
  if (row === undefined || row === AcceptedPartnerAlcohol.ANY) {
    return { status: 'SKIPPED', reasonCode: 'ALCOHOL_PREF_INACTIVE' };
  }
  const col = facts.alcoholUse;
  if (col === undefined) {
    return { status: 'FAIL', reasonCode: 'PARTNER_ALCOHOL_MISSING' };
  }
  if (col === AlcoholUseSelf.PREFER_NOT_TO_SAY) {
    return { status: 'FAIL', reasonCode: 'PARTNER_ALCOHOL_WITHHELD' };
  }
  const isNever = col === AlcoholUseSelf.NEVER;
  const isRare = col === AlcoholUseSelf.RARE;
  const isMod = col === AlcoholUseSelf.MODERATE;
  const isFreq = col === AlcoholUseSelf.FREQUENT;
  if (row === AcceptedPartnerAlcohol.NONE_ONLY) {
    if (isNever) return { status: 'PASS', reasonCode: 'ALCOHOL_MATRIX_PASS' };
    return { status: 'FAIL', reasonCode: 'ALCOHOL_MATRIX_FAIL' };
  }
  if (row === AcceptedPartnerAlcohol.MODERATE_OK) {
    if (isNever || isRare || isMod) return { status: 'PASS', reasonCode: 'ALCOHOL_MATRIX_PASS' };
    if (isFreq) return { status: 'FAIL', reasonCode: 'ALCOHOL_MATRIX_FAIL' };
    return { status: 'FAIL', reasonCode: 'ALCOHOL_MATRIX_FAIL' };
  }
  return { status: 'FAIL', reasonCode: 'ALCOHOL_MATRIX_FAIL' };
}

const MAJOR_FAITHS_NONE_ONLY_FAIL: ReadonlySet<ReligionSelf> = new Set([
  ReligionSelf.CHRISTIAN,
  ReligionSelf.MUSLIM,
  ReligionSelf.HINDU,
  ReligionSelf.BUDDHIST,
]);

function simReligion(pref: MatchingPreferences, facts: MatchingFacts): SimDimEval {
  const list = pref.acceptedPartnerReligions;
  if (list === undefined || list.length === 0) {
    return { status: 'SKIPPED', reasonCode: 'RELIGION_PREF_ABSENT' };
  }
  const rel = facts.religion;
  if (rel === undefined) {
    return { status: 'SOFT_PASS', reasonCode: 'SIM_RELIGION_MISSING_SOFT' };
  }
  if (rel === ReligionSelf.PREFER_NOT_TO_SAY) {
    return { status: 'SOFT_PASS', reasonCode: 'SIM_RELIGION_WITHHELD_SOFT' };
  }
  if (list.includes(rel)) {
    return { status: 'PASS', reasonCode: 'RELIGION_IN_ALLOWLIST' };
  }
  const onlyNone = list.length === 1 && list[0] === ReligionSelf.NONE;
  if (onlyNone) {
    if (rel === ReligionSelf.JEWISH) return { status: 'SOFT_PASS', reasonCode: 'SIM_RELIGION_NONE_ONLY_JEWISH_SOFT' };
    if (rel === ReligionSelf.SPIRITUAL_NON_AFFILIATED || rel === ReligionSelf.OTHER) {
      return { status: 'SOFT_PASS', reasonCode: 'SIM_RELIGION_NONE_ONLY_SPIRITUAL_OTHER_SOFT' };
    }
    if (MAJOR_FAITHS_NONE_ONLY_FAIL.has(rel)) {
      return { status: 'FAIL', reasonCode: 'RELIGION_NOT_IN_ALLOWLIST' };
    }
    if (rel === ReligionSelf.NONE) {
      return { status: 'PASS', reasonCode: 'RELIGION_IN_ALLOWLIST' };
    }
  }
  return { status: 'FAIL', reasonCode: 'RELIGION_NOT_IN_ALLOWLIST' };
}

/** Single SOFT_PASS: MUST_WANT × UNSURE; otherwise matches production baseline outcomes/reasons. */
function simPartnerWantsChildren(pref: MatchingPreferences, facts: MatchingFacts): SimDimEval {
  const req = pref.partnerWantsChildren;
  if (req === undefined || req === PartnerWantsChildrenRequirement.NO_REQUIREMENT) {
    return { status: 'SKIPPED', reasonCode: 'WANTS_CHILDREN_PREF_INACTIVE' };
  }
  const w = facts.wantsChildren;
  if (w === undefined || w === WantsChildrenSelf.PREFER_NOT_TO_SAY) {
    return { status: 'FAIL', reasonCode: 'PARTNER_WANTS_CHILDREN_UNKNOWN' };
  }
  if (req === PartnerWantsChildrenRequirement.MUST_WANT) {
    if (w === WantsChildrenSelf.YES) return { status: 'PASS', reasonCode: 'WANTS_CHILDREN_MUST_WANT_OK' };
    if (w === WantsChildrenSelf.UNSURE) {
      return { status: 'SOFT_PASS', reasonCode: 'WANTS_CHILDREN_MUST_WANT_UNSURE_SOFT' };
    }
    return { status: 'FAIL', reasonCode: 'WANTS_CHILDREN_MUST_WANT_FAIL' };
  }
  if (req === PartnerWantsChildrenRequirement.MUST_NOT_WANT) {
    if (w === WantsChildrenSelf.NO) return { status: 'PASS', reasonCode: 'WANTS_CHILDREN_MUST_NOT_WANT_OK' };
    return { status: 'FAIL', reasonCode: 'WANTS_CHILDREN_MUST_NOT_WANT_FAIL' };
  }
  return { status: 'SKIPPED', reasonCode: 'WANTS_CHILDREN_PREF_INACTIVE' };
}

function simEvalForDim(
  dim: HolyGrailDimensionKey,
  pref: MatchingPreferences,
  facts: MatchingFacts,
  evaluatedAt: Date,
): SimDimEval {
  switch (dim) {
    case 'AGE':
      return simAge(pref, facts, evaluatedAt, AGE_BUFFER_DELTA_YEARS);
    case 'ALCOHOL':
      return simAlcohol(pref, facts);
    case 'RELIGION':
      return simReligion(pref, facts);
    case 'PARTNER_WANTS_CHILDREN':
      return simPartnerWantsChildren(pref, facts);
    default:
      throw new Error(`unexpected soft dim ${dim}`);
  }
}

function baselineToSim(b: BaselineStatus): SimStatus {
  return b;
}

function buildSimDimensions(
  baseline: HolyGrailDirectionalEvaluationResult,
  pref: MatchingPreferences,
  facts: MatchingFacts,
  evaluatedAt: Date,
): Record<HolyGrailDimensionKey, SimDimEval> {
  const out = {} as Record<HolyGrailDimensionKey, SimDimEval>;
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    if (SOFT_PASS_DIMS.has(k)) {
      out[k] = simEvalForDim(k, pref, facts, evaluatedAt);
    } else {
      const st = baseline.dimensions[k].status;
      out[k] = { status: baselineToSim(st), reasonCode: baseline.dimensions[k].reasonCode };
    }
  }
  return out;
}

function overallFromSimDims(dims: Record<HolyGrailDimensionKey, SimDimEval>): 'PASS' | 'FAIL' {
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    if (dims[k].status === 'FAIL') return 'FAIL';
  }
  return 'PASS';
}

function initDim4<T>(init: () => T): Record<HolyGrailDimensionKey, T> {
  const o = {} as Record<HolyGrailDimensionKey, T>;
  for (const d of SOFT_PASS_DIMS) {
    o[d] = init();
  }
  return o;
}

function recommendDimension(args: {
  dim: HolyGrailDimensionKey;
  directionalFailToSoftPass: number;
  directionalFailToPass: number;
  baselineFailActive: number;
  pairsNewlyAdmittedCitingDim: number;
}): 'keep' | 'tighten' | 'reject' {
  const softened = args.directionalFailToSoftPass + args.directionalFailToPass;
  if (softened === 0 && args.pairsNewlyAdmittedCitingDim === 0) return 'reject';
  if (args.dim === 'RELIGION' && args.directionalFailToSoftPass > 80) return 'tighten';
  if (args.baselineFailActive > 0 && args.directionalFailToSoftPass / args.baselineFailActive > 0.85) return 'tighten';
  return 'keep';
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const evaluatedAt = new Date();

  const baselinePass = initDim4(() => 0);
  const baselineFail = initDim4(() => 0);
  const baselineSkipped = initDim4(() => 0);

  const simPass = initDim4(() => 0);
  const simSoftPass = initDim4(() => 0);
  const simFail = initDim4(() => 0);
  const simSkipped = initDim4(() => 0);

  /** baseline reason -> count where sim is SOFT_PASS (same dim, same direction) */
  const failReasonToSoftPass = initDim4(() => ({} as Record<string, number>));

  let directionalFailToSoftPass = initDim4(() => 0);
  let directionalFailToPass = initDim4(() => 0);
  let baselineFailActive = initDim4(() => 0);

  type PairKey = string;
  const baselineSurviving = new Set<PairKey>();
  const simSurviving = new Set<PairKey>();
  const baseCountBySearcher = new Map<string, number>();
  const simCountBySearcher = new Map<string, number>();

  type Change = {
    direction: 'stc' | 'cts';
    dimension: HolyGrailDimensionKey;
    oldStatus: BaselineStatus;
    oldReason: string;
    newStatus: SimStatus;
    newReason: string;
  };

  const newlyAdmittedDetails: Array<{
    searcherId: string;
    candidateId: string;
    baselinePairPass: boolean;
    simulatedPairPass: boolean;
    changes: Change[];
  }> = [];

  try {
    const searchers = await prisma.userProfile.findMany({
      where: {
        OR: SYNTHETIC_ID_PREFIX_ALLOWLIST.map((prefix) => ({ id: { startsWith: prefix } })),
      },
      orderBy: [{ id: 'asc' }],
      take: 5,
      select: { id: true },
    });
    const searcherIds = searchers.map((x) => x.id);

    for (const searcherId of searcherIds) {
      baseCountBySearcher.set(searcherId, 0);
      simCountBySearcher.set(searcherId, 0);

      const sRow = await prisma.userProfile.findUnique({
        where: { id: searcherId },
        include: { extractionV2: { select: { interests_self: true, interests: true, lifestyleTraits: true } } },
      });
      if (!sRow) continue;
      const sInput = buildHolyGrailProfileMappingInputFromDbRow({
        profileId: sRow.id,
        extractionV2: sRow.extractionV2,
        holyGrailStructuredFacts: sRow.holyGrailStructuredFacts,
        holyGrailStructuredPreferences: sRow.holyGrailStructuredPreferences,
      });
      let sCanon: MatchingCanonicalModel;
      try {
        sCanon = mapProfileSourceToMatchingCanonical(sInput);
      } catch {
        continue;
      }

      const candidateRows = await prisma.userProfile.findMany({
        where: {
          id: { not: searcherId },
          OR: VALIDATION_CANDIDATE_PREFIXES.map((prefix) => ({ id: { startsWith: prefix } })),
        },
        orderBy: [{ id: 'asc' }],
        include: { extractionV2: { select: { interests_self: true, interests: true, lifestyleTraits: true } } },
      });

      for (const cRow of candidateRows) {
        const cInput = buildHolyGrailProfileMappingInputFromDbRow({
          profileId: cRow.id,
          extractionV2: cRow.extractionV2,
          holyGrailStructuredFacts: cRow.holyGrailStructuredFacts,
          holyGrailStructuredPreferences: cRow.holyGrailStructuredPreferences,
        });
        let cCanon: MatchingCanonicalModel;
        try {
          cCanon = mapProfileSourceToMatchingCanonical(cInput);
        } catch {
          continue;
        }

        const stc = evaluateHolyGrailDirectional({ searcher: sCanon, counterparty: cCanon, evaluatedAt });
        const cts = evaluateHolyGrailDirectional({ searcher: cCanon, counterparty: sCanon, evaluatedAt });

        const prefStc = mergeEffectivePreferences(sCanon);
        const prefCts = mergeEffectivePreferences(cCanon);
        const simStc = buildSimDimensions(stc, prefStc, cCanon.facts, evaluatedAt);
        const simCts = buildSimDimensions(cts, prefCts, sCanon.facts, evaluatedAt);

        const stcSimPass = overallFromSimDims(simStc) === 'PASS';
        const ctsSimPass = overallFromSimDims(simCts) === 'PASS';

        const baselinePair = stc.overallHardEligibility === 'PASS' && cts.overallHardEligibility === 'PASS';
        const simPair = stcSimPass && ctsSimPass;
        const pairKey = [searcherId, cRow.id].sort().join('|');

        if (baselinePair) baselineSurviving.add(pairKey);
        if (simPair) simSurviving.add(pairKey);

        if (baselinePair) baseCountBySearcher.set(searcherId, (baseCountBySearcher.get(searcherId) ?? 0) + 1);
        if (simPair) simCountBySearcher.set(searcherId, (simCountBySearcher.get(searcherId) ?? 0) + 1);

        const recordDir = (
          baselineDir: HolyGrailDirectionalEvaluationResult,
          simDims: Record<HolyGrailDimensionKey, SimDimEval>,
          dir: 'stc' | 'cts',
        ) => {
          for (const dim of SOFT_PASS_DIMS) {
            const b = baselineDir.dimensions[dim];
            const s = simDims[dim];
            const bs = b.status as BaselineStatus;

            if (bs === 'PASS' || bs === 'SOFT_PASS') baselinePass[dim] += 1;
            else if (bs === 'FAIL') baselineFail[dim] += 1;
            else baselineSkipped[dim] += 1;

            if (bs === 'FAIL') baselineFailActive[dim] += 1;

            if (s.status === 'PASS') simPass[dim] += 1;
            else if (s.status === 'SOFT_PASS') simSoftPass[dim] += 1;
            else if (s.status === 'FAIL') simFail[dim] += 1;
            else simSkipped[dim] += 1;

            if (bs === 'FAIL' && s.status === 'SOFT_PASS') {
              directionalFailToSoftPass[dim] += 1;
              const r = b.reasonCode;
              failReasonToSoftPass[dim][r] = (failReasonToSoftPass[dim][r] ?? 0) + 1;
            }
            if (bs === 'FAIL' && s.status === 'PASS') {
              directionalFailToPass[dim] += 1;
            }
          }
        };

        recordDir(stc, simStc, 'stc');
        recordDir(cts, simCts, 'cts');

        if (!baselinePair && simPair) {
          const changes: Change[] = [];
          const pushChanges = (
            baselineDir: HolyGrailDirectionalEvaluationResult,
            simDims: Record<HolyGrailDimensionKey, SimDimEval>,
            direction: 'stc' | 'cts',
          ) => {
            for (const dim of SOFT_PASS_DIMS) {
              const b = baselineDir.dimensions[dim];
              const s = simDims[dim];
              if (b.status === 'FAIL' && s.status !== 'FAIL') {
                changes.push({
                  direction,
                  dimension: dim,
                  oldStatus: b.status,
                  oldReason: b.reasonCode,
                  newStatus: s.status,
                  newReason: s.reasonCode,
                });
              }
            }
          };
          pushChanges(stc, simStc, 'stc');
          pushChanges(cts, simCts, 'cts');
          newlyAdmittedDetails.push({
            searcherId,
            candidateId: cRow.id,
            baselinePairPass: baselinePair,
            simulatedPairPass: simPair,
            changes,
          });
        }
      }
    }

    const pairHardFailToSimPass = newlyAdmittedDetails.length;
    let directionalSoftened = 0;
    for (const d of SOFT_PASS_DIMS) {
      directionalSoftened += directionalFailToSoftPass[d] + directionalFailToPass[d];
    }
    let improvedSearchers = 0;
    for (const sid of searcherIds) {
      if ((simCountBySearcher.get(sid) ?? 0) > (baseCountBySearcher.get(sid) ?? 0)) improvedSearchers += 1;
    }

    const topNewlyAdmitted = newlyAdmittedDetails.slice(0, 25);

    const recommendations: Record<HolyGrailDimensionKey, 'keep' | 'tighten' | 'reject'> = {} as Record<
      HolyGrailDimensionKey,
      'keep' | 'tighten' | 'reject'
    >;
    for (const dim of SOFT_PASS_DIMS) {
      recommendations[dim] = recommendDimension({
        dim,
        directionalFailToSoftPass: directionalFailToSoftPass[dim],
        directionalFailToPass: directionalFailToPass[dim],
        baselineFailActive: baselineFailActive[dim],
        pairsNewlyAdmittedCitingDim: newlyAdmittedDetails.filter((p) => p.changes.some((c) => c.dimension === dim))
          .length,
      });
    }

    const report = {
      meta: {
        pool: 'same as hg-validation-report',
        searchers: searcherIds,
        ageBufferDeltaYears: AGE_BUFFER_DELTA_YEARS,
        evaluatedAtIso: evaluatedAt.toISOString(),
      },
      pairStats: {
        baselineSurvivingPairs: baselineSurviving.size,
        simulatedSurvivingPairs: simSurviving.size,
        newlyAdmittedPairs: pairHardFailToSimPass,
        directionalImprovementsOnSoftDims: directionalSoftened,
        searchersWithMoreSimulatedCandidates: improvedSearchers,
      },
      perDimension: Object.fromEntries(
        [...SOFT_PASS_DIMS].map((dim) => {
          const bTotal = baselinePass[dim] + baselineFail[dim] + baselineSkipped[dim];
          const sTotal = simPass[dim] + simSoftPass[dim] + simFail[dim] + simSkipped[dim];
          const topSoftFromReason = Object.entries(failReasonToSoftPass[dim])
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 10)
            .map(([reason, count]) => ({ baselineFailReason: reason, countNowSoftPass: count }));
          return [
            dim,
            {
              baseline: {
                PASS: baselinePass[dim],
                FAIL: baselineFail[dim],
                SKIPPED: baselineSkipped[dim],
                total: bTotal,
              },
              simulated: {
                PASS: simPass[dim],
                SOFT_PASS: simSoftPass[dim],
                FAIL: simFail[dim],
                SKIPPED: simSkipped[dim],
                total: sTotal,
              },
              delta: {
                PASS: simPass[dim] - baselinePass[dim],
                FAIL: simFail[dim] - baselineFail[dim],
                SKIPPED: simSkipped[dim] - baselineSkipped[dim],
                SOFT_PASS_new: simSoftPass[dim],
              },
              topBaselineFailReasonsReducedBySoftPass: topSoftFromReason,
              directionalFailToSoftPass: directionalFailToSoftPass[dim],
              directionalFailToPass: directionalFailToPass[dim],
              recommendation: recommendations[dim],
            },
          ];
        }),
      ),
      newlyAdmittedPairsTop20: topNewlyAdmitted.map((p) => ({
        searcherId: p.searcherId,
        candidateId: p.candidateId,
        dimensionsTouched: [...new Set(p.changes.map((c) => c.dimension))],
        changes: p.changes,
        summaryReason: p.changes
          .map((c) => `${c.direction} ${c.dimension}: ${c.oldStatus}/${c.oldReason} → ${c.newStatus}/${c.newReason}`)
          .join('; '),
      })),
      recommendations,
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8');

    // --- Console: executive summary + tables (markdown-friendly) ---
    console.log('# HG SOFT_PASS simulation (read-only)\n');
    console.log('## 1. Executive summary\n');
    console.log(
      `- Pool: first 5 synthetic searchers (by id), all other synthetic candidates (${VALIDATION_CANDIDATE_PREFIXES.join(', ')}), both directions per pair.`,
    );
    console.log(`- Baseline surviving pairs (both directions hard PASS): ${baselineSurviving.size}`);
    console.log(`- Simulated surviving pairs (FAIL blocks; SOFT_PASS does not): ${simSurviving.size}`);
    console.log(`- **Pairs newly admitted** (baseline fail → sim pass): **${pairHardFailToSimPass}**`);
    console.log(
      `- Directional improvements on AGE/ALCOHOL/RELIGION/PARTNER_WANTS_CHILDREN (FAIL→SOFT_PASS or FAIL→PASS): ${directionalSoftened}`,
    );
    console.log(`- Searchers with strictly more simulated survivors: ${improvedSearchers} / ${searcherIds.length}`);
    console.log(`- Full JSON: ${OUTPUT_JSON}\n`);

    console.log('## 2. Per-dimension comparison\n');
    console.log('| Dimension | B:PASS | B:FAIL | B:SKIP | S:PASS | S:SOFT | S:FAIL | S:SKIP | ΔFAIL |');
    console.log('|-----------|--------|--------|--------|--------|--------|--------|--------|-------|');
    for (const dim of [...SOFT_PASS_DIMS].sort()) {
      const dFail = simFail[dim] - baselineFail[dim];
      console.log(
        `| ${dim} | ${baselinePass[dim]} | ${baselineFail[dim]} | ${baselineSkipped[dim]} | ${simPass[dim]} | ${simSoftPass[dim]} | ${simFail[dim]} | ${simSkipped[dim]} | ${dFail} |`,
      );
    }
    console.log('');

    for (const dim of [...SOFT_PASS_DIMS].sort()) {
      console.log(`### ${dim} — top baseline FAIL reasons → SOFT_PASS`);
      const rows = Object.entries(failReasonToSoftPass[dim])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8);
      if (rows.length === 0) console.log('_(none)_');
      else for (const [reason, n] of rows) console.log(`- \`${reason}\`: ${n}`);
      console.log('');
    }

    console.log('## 3. Newly admitted pairs (up to 25)\n');
    if (topNewlyAdmitted.length === 0) console.log('_(none)_\n');
    else {
      for (const p of report.newlyAdmittedPairsTop20) {
        console.log(`- **${p.searcherId}** × **${p.candidateId}**`);
        console.log(`  - Dimensions: ${p.dimensionsTouched.join(', ')}`);
        console.log(`  - ${p.summaryReason}`);
      }
      console.log('');
    }

    console.log('## 4. Recommendation per dimension\n');
    for (const dim of [...SOFT_PASS_DIMS].sort()) {
      console.log(`- **${dim}**: **${recommendations[dim]}**`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('hg-soft-pass-simulation failed:', err);
  process.exit(1);
});
