/**
 * Prisma-backed profile storage with evaluation persistence.
 * DB-only behavior (no JSON fallback).
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SimpleLogger } from '../logger/simple-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import {
  sanitizeEnrichmentSignalsV1ForPersist,
  wrapEnrichmentV1,
  type EnrichmentSignalsV1,
} from '../evaluate/enrichment-signals';
import type { MatchingRankingSignalsSnapshot } from '../canonical/matching-canonical.types';
import { HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT } from '../holy-grail-matching/holy-grail-ranking-signal-self.select';
import { composeHolyGrailRankingSignalsForPersist } from '../holy-grail-matching/holy-grail-ranking-signals-from-db';
import type { ChildrenUnsureProfileRow } from '../matches/children-unsure-profile-row.types';
import type { ProfileJsonPayload, ProfileListItem } from './profiles.types';

/**
 * Single `userProfile` read for match list: legacy compare payload (`rowToPayload`) plus HG row slice
 * (structured JSON, extractionV2, self signal snapshot). Keeps parity with `getFromPrisma` + children-unsure select.
 */
const MATCH_LIST_PROFILE_DATA_SELECT = {
  id: true,
  name: true,
  aboutMe: true,
  aboutPartner: true,
  aboutRelationship: true,
  createdAt: true,
  updatedAt: true,
  holyGrailStructuredFacts: true,
  holyGrailStructuredPreferences: true,
  evaluationRaw: {
    select: {
      evaluation: true,
    },
  },
  signalSnapshots: {
    where: { domain: 'self' as const },
    select: HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT,
  },
  evaluation: {
    select: {
      evaluatedAt: true,
      promptVersion: true,
      policyVersion: true,
      textHash: true,
    },
  },
  extractionV2: {
    select: { interests_self: true, interests: true, lifestyleTraits: true },
  },
} as const satisfies Prisma.UserProfileSelect;

type MatchListProfileDbRow = Prisma.UserProfileGetPayload<{ select: typeof MATCH_LIST_PROFILE_DATA_SELECT }>;

/** One `findMany` read supplies legacy compare payloads and HG pair rows (list + detail + compare). */
export interface MatchPairRuntimeBundle {
  readonly profileA: ProfileJsonPayload;
  readonly profileB: ProfileJsonPayload;
  readonly rowA: ChildrenUnsureProfileRow;
  readonly rowB: ChildrenUnsureProfileRow;
}

interface UserProfileRow {
  id: string;
  name: string;
  aboutMe: string;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  createdAt: Date;
  updatedAt: Date;
  evaluationRaw?: { evaluation: unknown } | null;
  signalSnapshots?: {
    lifestylePace: number | null;
    conflictStyle: number | null;
    hgRankingDailyRhythm: string | null;
    hgRankingAutonomyTogetherness: string | null;
    hgRankingInterestsTop: string[];
  }[];
  evaluationMeta?: {
    evaluatedAt: Date | null;
    promptVersion: string | null;
    policyVersion: string | null;
    textHash: string | null;
  } | null;
}

const SIGNAL_KEYS = [
  'ambition',
  'socialBattery',
  'healthBodyConsciousness',
  'emotionalDepth',
  'attachmentSecurity',
  'directness',
  'independence',
  'traditionalism',
  'financialMindset',
  'relationshipClarity',
  'spirituality',
  'lifestylePace',
  'physicalPriority',
  'statusOrientation',
  'intellectualCuriosity',
  'conflictStyle',
  'noveltyVsRoutine',
  'structureChaosTolerance',
] as const;

type SignalKey = (typeof SIGNAL_KEYS)[number];
type DomainSignals = Record<string, unknown> | null | undefined;
type SignalSnapshotRow = {
  profileId: string;
  domain: string;
  ambition: number | null;
  socialBattery: number | null;
  healthBodyConsciousness: number | null;
  emotionalDepth: number | null;
  attachmentSecurity: number | null;
  directness: number | null;
  independence: number | null;
  traditionalism: number | null;
  financialMindset: number | null;
  relationshipClarity: number | null;
  spirituality: number | null;
  lifestylePace: number | null;
  physicalPriority: number | null;
  statusOrientation: number | null;
  intellectualCuriosity: number | null;
  conflictStyle: number | null;
  noveltyVsRoutine: number | null;
  structureChaosTolerance: number | null;
  hgRankingDailyRhythm: string | null;
  hgRankingAutonomyTogetherness: string | null;
  hgRankingInterestsTop: string[];
};

@Injectable()
export class ProfilesPrismaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: SimpleLogger,
  ) {
    this.logger.log(
      'ProfilesPrismaService: DB-only mode enabled',
      'ProfilesPrismaService',
    );
  }

  /**
   * Save profile with evaluation data in PostgreSQL.
   */
  async save(id: string, payload: Omit<ProfileJsonPayload, 'savedAt'>): Promise<void> {
    await this.saveToPrisma(id, payload);
  }

  /**
   * Get profile by id from PostgreSQL.
   */
  async getById(id: string): Promise<ProfileJsonPayload | null> {
    const dbRow = await this.getFromPrisma(id);
    if (!dbRow) return null;
    return this.rowToPayload(dbRow);
  }

  /**
   * List all profiles from PostgreSQL.
   */
  async list(): Promise<ProfileListItem[]> {
    return this.listFromPrisma();
  }

  /**
   * Single batched read for match list runtime: legacy compare inputs (`ProfileJsonPayload`) in list order,
   * plus the HG profile row map (same slice as `CHILDREN_UNSURE_PROFILE_ROW_SELECT` / `getFromPrisma` signals).
   */
  async loadMatchListProfileData(): Promise<{
    profiles: ProfileJsonPayload[];
    holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    const listItems = await this.listFromPrisma();
    if (listItems.length === 0) {
      return { profiles: [], holyGrailRowsById: new Map() };
    }
    const listIds = listItems.map((x) => x.id);
    const rows = await this.prisma.userProfile.findMany({
      where: { id: { in: listIds } },
      select: MATCH_LIST_PROFILE_DATA_SELECT,
    });
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const profiles: ProfileJsonPayload[] = [];
    const holyGrailRowsById = new Map<string, ChildrenUnsureProfileRow>();
    for (const id of listIds) {
      const row = rowById.get(id);
      if (!row) continue;
      profiles.push(this.rowToPayload(this.matchListDbRowToUserProfileRow(row)));
      holyGrailRowsById.set(id, this.matchListDbRowToHolyGrailProfileRow(row));
    }
    return { profiles, holyGrailRowsById };
  }

  /**
   * Same payloads as `loadMatchListProfileData`, but restricted to an explicit id list (order preserved).
   * For scripts / diagnostics that must not fan out to all profiles × all profiles.
   */
  /**
   * Single batched `UserProfile` read for a pair: same `ProfileJsonPayload` + HG row mapping as list/compare
   * (`MATCH_LIST_PROFILE_DATA_SELECT`). Callers run legacy compare + HG without a second profile query.
   */
  async loadMatchPairRuntimeBundle(aId: string, bId: string): Promise<MatchPairRuntimeBundle | null> {
    if (aId === bId) return null;
    const rows = await this.prisma.userProfile.findMany({
      where: { id: { in: [aId, bId] } },
      select: MATCH_LIST_PROFILE_DATA_SELECT,
    });
    if (rows.length !== 2) return null;
    const byId = new Map(rows.map((r) => [r.id, r as MatchListProfileDbRow]));
    const rawA = byId.get(aId);
    const rawB = byId.get(bId);
    if (!rawA || !rawB) return null;
    return {
      profileA: this.rowToPayload(this.matchListDbRowToUserProfileRow(rawA)),
      profileB: this.rowToPayload(this.matchListDbRowToUserProfileRow(rawB)),
      rowA: this.matchListDbRowToHolyGrailProfileRow(rawA),
      rowB: this.matchListDbRowToHolyGrailProfileRow(rawB),
    };
  }

  async loadMatchListProfileDataForSubset(profileIdsOrdered: readonly string[]): Promise<{
    profiles: ProfileJsonPayload[];
    holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    if (profileIdsOrdered.length === 0) {
      return { profiles: [], holyGrailRowsById: new Map() };
    }
    const rows = await this.prisma.userProfile.findMany({
      where: { id: { in: [...profileIdsOrdered] } },
      select: MATCH_LIST_PROFILE_DATA_SELECT,
    });
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const profiles: ProfileJsonPayload[] = [];
    const holyGrailRowsById = new Map<string, ChildrenUnsureProfileRow>();
    for (const id of profileIdsOrdered) {
      const row = rowById.get(id);
      if (!row) continue;
      profiles.push(this.rowToPayload(this.matchListDbRowToUserProfileRow(row)));
      holyGrailRowsById.set(id, this.matchListDbRowToHolyGrailProfileRow(row));
    }
    return { profiles, holyGrailRowsById };
  }

  private matchListDbRowToUserProfileRow(row: MatchListProfileDbRow): UserProfileRow {
    return {
      id: row.id,
      name: row.name,
      aboutMe: row.aboutMe,
      aboutPartner: row.aboutPartner,
      aboutRelationship: row.aboutRelationship,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      evaluationRaw: row.evaluationRaw
        ? { evaluation: row.evaluationRaw.evaluation }
        : null,
      signalSnapshots: row.signalSnapshots,
      evaluationMeta: row.evaluation
        ? {
            evaluatedAt: row.evaluation.evaluatedAt,
            promptVersion: row.evaluation.promptVersion,
            policyVersion: row.evaluation.policyVersion,
            textHash: row.evaluation.textHash,
          }
        : null,
    };
  }

  private matchListDbRowToHolyGrailProfileRow(row: MatchListProfileDbRow): ChildrenUnsureProfileRow {
    return {
      id: row.id,
      aboutMe: row.aboutMe,
      aboutPartner: row.aboutPartner,
      holyGrailStructuredFacts: row.holyGrailStructuredFacts,
      holyGrailStructuredPreferences: row.holyGrailStructuredPreferences,
      extractionV2: row.extractionV2,
      signalSnapshots: row.signalSnapshots,
    };
  }

  private evaluationWithSanitizedEnrichment(
    evaluation: EvaluateBatchResult,
    opts?: { profileId?: string; logDropped?: boolean },
  ): EvaluateBatchResult {
    const en = evaluation.enrichment;
    if (!en || en.version !== 'v1' || !en.signals) return evaluation;
    const logDropped = opts?.logDropped === true;
    const profileId = opts?.profileId ?? null;
    const signals = sanitizeEnrichmentSignalsV1ForPersist(en.signals, {
      profileId,
      onDropped: logDropped
        ? (e) =>
            this.logger.warn(
              JSON.stringify({ event: 'enrichment_field_dropped', ...e }),
              'ProfilesPrisma',
            )
        : undefined,
    });
    return {
      ...evaluation,
      enrichment: wrapEnrichmentV1(signals),
    };
  }

  private async saveToPrisma(
    id: string,
    payload: Omit<ProfileJsonPayload, 'savedAt'>,
  ): Promise<void> {
    const evaluation = this.evaluationWithSanitizedEnrichment(payload.evaluation, {
      profileId: id,
      logDropped: true,
    });
    const evaluatedAt = payload.evaluatedAt ? new Date(payload.evaluatedAt) : null;
    const promptVersion = payload.promptVersion || null;
    const policyVersion = payload.policyVersion || null;
    const textHash = payload.textHash || null;

    const selfSignals = this.takeSignalsByDomain(payload, 'self');
    const partnerSignals = this.takeSignalsByDomain(payload, 'partner');
    const relationshipSignals = this.takeSignalsByDomain(payload, 'relationship');

    await this.prisma.$transaction(async (tx) => {
      await tx.userProfile.upsert({
        where: { id },
        create: {
          id,
          name: payload.name,
          aboutMe: payload.texts.aboutMe,
          aboutPartner: payload.texts.aboutPartner || null,
          aboutRelationship: payload.texts.aboutRelationship || null,
        },
        update: {
          name: payload.name,
          aboutMe: payload.texts.aboutMe,
          aboutPartner: payload.texts.aboutPartner || null,
          aboutRelationship: payload.texts.aboutRelationship || null,
        },
      });

      await tx.profileEvaluation.upsert({
        where: { profileId: id },
        create: {
          profileId: id,
          evaluatedAt,
          promptVersion,
          policyVersion,
          textHash,
        },
        update: {
          evaluatedAt,
          promptVersion,
          policyVersion,
          textHash,
        },
      });

      await tx.profileSignalSnapshot.deleteMany({
        where: { profileId: id },
      });

      const extractionRow = await tx.profileExtractionV2.findUnique({
        where: { profileId: id },
        select: { interests_self: true },
      });
      const selfLp =
        selfSignals && typeof selfSignals.lifestylePace === 'number' ? selfSignals.lifestylePace : null;
      const selfCs =
        selfSignals && typeof selfSignals.conflictStyle === 'number' ? selfSignals.conflictStyle : null;
      const composedRanking = composeHolyGrailRankingSignalsForPersist({
        evaluation,
        interestsSelf: extractionRow?.interests_self,
        signalSelfNumerics: { lifestylePace: selfLp, conflictStyle: selfCs },
      });

      await tx.profileSignalSnapshot.createMany({
        data: [
          this.toSignalSnapshotRow(id, 'self', selfSignals, composedRanking),
          this.toSignalSnapshotRow(id, 'partner', partnerSignals, null),
          this.toSignalSnapshotRow(id, 'relationship', relationshipSignals, null),
        ],
      });

      const evaluationForPersist = this.stripHgRankingEnrichmentFromEvaluationBeforePersist(evaluation);
      const evaluationJson = evaluationForPersist as unknown as Prisma.InputJsonValue;

      await tx.profileEvaluationRaw.upsert({
        where: { profileId: id },
        create: {
          profileId: id,
          evaluation: evaluationJson,
        },
        update: {
          evaluation: evaluationJson,
        },
      });
    });
  }

  private takeSignalsByDomain(
    payload: Omit<ProfileJsonPayload, 'savedAt'>,
    domain: 'self' | 'partner' | 'relationship',
  ): DomainSignals {
    const block = (payload.evaluation as unknown as Record<string, unknown> | undefined)?.[domain];
    if (!block || typeof block !== 'object') return null;
    const signals = (block as Record<string, unknown>).signals;
    return signals && typeof signals === 'object' ? (signals as Record<string, unknown>) : null;
  }

  private toSignalSnapshotRow(
    profileId: string,
    domain: 'self' | 'partner' | 'relationship',
    signals: DomainSignals,
    composedRanking: MatchingRankingSignalsSnapshot | null,
  ): SignalSnapshotRow {
    const row: SignalSnapshotRow = {
      profileId,
      domain,
      ambition: null,
      socialBattery: null,
      healthBodyConsciousness: null,
      emotionalDepth: null,
      attachmentSecurity: null,
      directness: null,
      independence: null,
      traditionalism: null,
      financialMindset: null,
      relationshipClarity: null,
      spirituality: null,
      lifestylePace: null,
      physicalPriority: null,
      statusOrientation: null,
      intellectualCuriosity: null,
      conflictStyle: null,
      noveltyVsRoutine: null,
      structureChaosTolerance: null,
      hgRankingDailyRhythm: null,
      hgRankingAutonomyTogetherness: null,
      hgRankingInterestsTop: [],
    };

    if (!signals) {
      if (domain === 'self' && composedRanking) {
        row.hgRankingDailyRhythm = composedRanking.dailyRhythm;
        row.hgRankingAutonomyTogetherness = composedRanking.autonomyTogetherness;
        row.hgRankingInterestsTop = [...composedRanking.interestsTop];
      }
      return row;
    }

    for (const key of SIGNAL_KEYS) {
      if (Object.prototype.hasOwnProperty.call(signals, key)) {
        const value = signals[key];
        row[key] = typeof value === 'number' ? value : null;
      }
    }

    if (domain === 'self' && composedRanking) {
      row.hgRankingDailyRhythm = composedRanking.dailyRhythm;
      row.hgRankingAutonomyTogetherness = composedRanking.autonomyTogetherness;
      row.hgRankingInterestsTop = [...composedRanking.interestsTop];
    }

    return row;
  }

  private async getFromPrisma(id: string): Promise<UserProfileRow | null> {
    const row = await this.prisma.userProfile.findUnique({
      where: { id },
      include: {
        evaluationRaw: {
          select: {
            evaluation: true,
          },
        },
        signalSnapshots: {
          where: { domain: 'self' },
          select: HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT,
        },
        evaluation: {
          select: {
            evaluatedAt: true,
            promptVersion: true,
            policyVersion: true,
            textHash: true,
          },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      aboutMe: row.aboutMe,
      aboutPartner: row.aboutPartner,
      aboutRelationship: row.aboutRelationship,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      evaluationRaw: row.evaluationRaw
        ? { evaluation: row.evaluationRaw.evaluation }
        : null,
      signalSnapshots: row.signalSnapshots,
      evaluationMeta: row.evaluation
        ? {
            evaluatedAt: row.evaluation.evaluatedAt,
            promptVersion: row.evaluation.promptVersion,
            policyVersion: row.evaluation.policyVersion,
            textHash: row.evaluation.textHash,
          }
        : null,
    };
  }

  private async listFromPrisma(): Promise<ProfileListItem[]> {
    const rows = await this.prisma.userProfile.findMany({
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      savedAt: row.updatedAt.toISOString(),
    }));
  }

  private rowToPayload(row: UserProfileRow): ProfileJsonPayload {
    const rawEvaluation =
      (row.evaluationRaw?.evaluation as EvaluateBatchResult | undefined) ??
      ({
        self: { domain: 'self', signals: {}, evidence: [], version: 'v1', confidence: 0 },
        partner: { domain: 'partner', signals: {}, evidence: [], version: 'v1', confidence: 0 },
        relationship: { domain: 'relationship', signals: {}, evidence: [], version: 'v1', confidence: 0 },
        compatibility: {
          selfVsPartner: { overallScore: 0, coverage: 0, matchedSignals: 0, hardMismatches: [], breakdown: [] },
          selfVsRelationship: { overallScore: 0, coverage: 0, matchedSignals: 0, hardMismatches: [], breakdown: [] },
        },
        display: { summary: 'Not analyzed yet.', insight: '' },
        productScores: {
          partnerFitScore: 0,
          relationshipFitScore: 0,
          coverageScore: 0,
          frictionRiskScore: 0,
          overallDecisionScore: 0,
          policyVersion: 'product-score-v1',
        },
        productScoresPresentation: {
          partnerFitScore: { kind: 'insufficient_data' },
          relationshipFitScore: { kind: 'insufficient_data' },
          coverageScore: { kind: 'insufficient_data' },
          frictionRiskScore: { kind: 'insufficient_data' },
          overallDecisionScore: { kind: 'insufficient_data' },
        },
        flags: [],
        chips: { self: [], partner: [], relationship: [] },
      } as EvaluateBatchResult);

    let evaluation: EvaluateBatchResult = rawEvaluation.chips
      ? rawEvaluation
      : {
          ...rawEvaluation,
          chips: { self: [], partner: [], relationship: [] },
        };

    evaluation = this.evaluationWithSanitizedEnrichment(evaluation, {
      profileId: row.id,
      logDropped: false,
    });

    evaluation = this.applySelfSnapshotHgRankingToEvaluationPayload(evaluation, row.signalSnapshots?.[0]);

    return {
      id: row.id,
      name: row.name,
      texts: {
        aboutMe: row.aboutMe,
        aboutPartner: row.aboutPartner || '',
        aboutRelationship: row.aboutRelationship || '',
      },
      evaluation,
      savedAt: row.updatedAt.toISOString(),
      evaluationStatus: row.evaluationMeta?.evaluatedAt ? 'DONE' : undefined,
      evaluatedAt: row.evaluationMeta?.evaluatedAt?.toISOString(),
      promptVersion: row.evaluationMeta?.promptVersion || undefined,
      policyVersion: row.evaluationMeta?.policyVersion || undefined,
      textHash: row.evaluationMeta?.textHash || undefined,
      signals:
        ((row.evaluationRaw?.evaluation as EvaluateBatchResult | undefined)?.self
          ?.signals as Record<string, number | null> | undefined) ?? undefined,
    };
  }

  private static readonly _HG_RAW_JSON_OMIT_KEYS = [
    'dailyRhythm',
    'autonomyTogethernessDepth',
    'interestsTop3',
    'autonomyTogetherness',
    'interestsTop',
  ] as const;

  private stripHgRankingEnrichmentFromEvaluationBeforePersist(evaluation: EvaluateBatchResult): EvaluateBatchResult {
    const c = JSON.parse(JSON.stringify(evaluation)) as EvaluateBatchResult;
    const en = c.enrichment;
    if (!en || en.version !== 'v1' || !en.signals || typeof en.signals !== 'object') return c;
    const sig = en.signals as unknown as Record<string, unknown>;
    for (const k of ProfilesPrismaService._HG_RAW_JSON_OMIT_KEYS) {
      delete sig[k];
    }
    return c;
  }

  private applySelfSnapshotHgRankingToEvaluationPayload(
    evaluation: EvaluateBatchResult,
    selfSnap:
      | {
          hgRankingDailyRhythm: string | null;
          hgRankingAutonomyTogetherness: string | null;
          hgRankingInterestsTop: string[];
        }
      | undefined,
  ): EvaluateBatchResult {
    if (!selfSnap) return evaluation;
    const en = evaluation.enrichment;
    if (!en || en.version !== 'v1') return evaluation;
    const c = JSON.parse(JSON.stringify(evaluation)) as EvaluateBatchResult;
    const signals = JSON.parse(JSON.stringify(c.enrichment!.signals)) as EnrichmentSignalsV1;
    const dr = selfSnap.hgRankingDailyRhythm;
    if (typeof dr === 'string' && dr.trim() !== '') {
      signals.dailyRhythm = dr.trim() as EnrichmentSignalsV1['dailyRhythm'];
    }
    const at = selfSnap.hgRankingAutonomyTogetherness;
    if (typeof at === 'string' && at.trim() !== '') {
      signals.autonomyTogethernessDepth = at.trim() as EnrichmentSignalsV1['autonomyTogethernessDepth'];
    }
    const top = selfSnap.hgRankingInterestsTop;
    if (Array.isArray(top) && top.length > 0) {
      signals.interestsTop3 = top
        .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
        .map((x) => x.trim());
    }
    c.enrichment = { version: 'v1', signals };
    return c;
  }
}
