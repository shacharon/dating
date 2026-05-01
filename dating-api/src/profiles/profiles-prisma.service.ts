/**
 * Prisma-backed profile storage with evaluation persistence.
 * DB-only behavior (no JSON fallback).
 */

import { Injectable } from '@nestjs/common';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import {
  sanitizeEnrichmentSignalsV1ForPersist,
  wrapEnrichmentV1,
  type EnrichmentSignalsV1,
} from '../evaluate/enrichment-signals';
import type { MatchingRankingSignalsSnapshot } from '../canonical/matching-canonical.types';
import { composeHolyGrailRankingSignalsForPersist } from '../holy-grail-matching/holy-grail-ranking-signals-from-db';
import type { ChildrenUnsureProfileRow } from '../matches/children-unsure-profile-row.types';
import type { ProfileJsonPayload, ProfileListItem } from './profiles.types';

/** Legacy bundle shape; MatchmakingProfile reads removed (slice 8 / pre–Migration 4). */
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
  constructor(private readonly logger: SimpleLogger) {
    this.logger.log(
      'ProfilesPrismaService: DB-only mode enabled',
      'ProfilesPrismaService',
    );
  }

  /**
   * Save profile with evaluation data in PostgreSQL.
   */
  async save(
    id: string,
    payload: Omit<ProfileJsonPayload, 'savedAt'>,
  ): Promise<void> {
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
   * Legacy match list bundle. `MatchmakingProfile` reads disabled (slice 8); returns empty until Migration 4.
   */
  async loadMatchListProfileData(): Promise<{
    profiles: ProfileJsonPayload[];
    holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    return { profiles: [], holyGrailRowsById: new Map() };
  }

  /**
   * Legacy pair bundle. `MatchmakingProfile` reads disabled (slice 8).
   */
  async loadMatchPairRuntimeBundle(
    aId: string,
    bId: string,
  ): Promise<MatchPairRuntimeBundle | null> {
    if (aId === bId) return null;
    return null;
  }

  async loadMatchListProfileDataForSubset(
    profileIdsOrdered: readonly string[],
  ): Promise<{
    profiles: ProfileJsonPayload[];
    holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    void profileIdsOrdered;
    return { profiles: [], holyGrailRowsById: new Map() };
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

  /**
   * @deprecated LEGACY PATH — FROZEN.
   * Previously wrote MatchmakingProfile + ProfileSignalSnapshot; both write paths are disabled (slice 7+).
   * New product path: MeProfileAnalysisService → UserProfile + UserProfileEvaluation.
   * DO NOT add new callers.
   */
  private async saveToPrisma(
    id: string,
    payload: Omit<ProfileJsonPayload, 'savedAt'>,
  ): Promise<void> {
    this.logger.warn(
      `[LEGACY] saveToPrisma called for profileId=${id} — legacy table write is frozen`,
      'ProfilesPrisma',
    );
    const evaluation = this.evaluationWithSanitizedEnrichment(
      payload.evaluation,
      {
        profileId: id,
        logDropped: true,
      },
    );
    const selfSignals = this.takeSignalsByDomain(payload, 'self');
    const partnerSignals = this.takeSignalsByDomain(payload, 'partner');
    const relationshipSignals = this.takeSignalsByDomain(
      payload,
      'relationship',
    );

    const selfLp =
      selfSignals && typeof selfSignals.lifestylePace === 'number'
        ? selfSignals.lifestylePace
        : null;
    const selfCs =
      selfSignals && typeof selfSignals.conflictStyle === 'number'
        ? selfSignals.conflictStyle
        : null;
    const composedRanking = composeHolyGrailRankingSignalsForPersist({
      evaluation,
      interestsSelf: undefined,
      signalSelfNumerics: { lifestylePace: selfLp, conflictStyle: selfCs },
    });
    void partnerSignals;
    void relationshipSignals;
    void composedRanking;
    this.logger.warn(
      `[LEGACY] ProfileSignalSnapshot writes disabled (pre-drop slice) for profileId=${id}`,
      'ProfilesPrisma',
    );
    this.logger.warn(
      `[LEGACY] MatchmakingProfile writes disabled (slice 7 / pre–Migration 4) for profileId=${id}`,
      'ProfilesPrisma',
    );
  }

  private takeSignalsByDomain(
    payload: Omit<ProfileJsonPayload, 'savedAt'>,
    domain: 'self' | 'partner' | 'relationship',
  ): DomainSignals {
    const block = (
      payload.evaluation as unknown as Record<string, unknown> | undefined
    )?.[domain];
    if (!block || typeof block !== 'object') return null;
    const signals = (block as Record<string, unknown>).signals;
    return signals && typeof signals === 'object'
      ? (signals as Record<string, unknown>)
      : null;
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
        row.hgRankingAutonomyTogetherness =
          composedRanking.autonomyTogetherness;
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

  private async getFromPrisma(_id: string): Promise<UserProfileRow | null> {
    void _id;
    return null;
  }

  private async listFromPrisma(): Promise<ProfileListItem[]> {
    return [];
  }

  private rowToPayload(row: UserProfileRow): ProfileJsonPayload {
    const rawEvaluation: EvaluateBatchResult = {
        self: {
          domain: 'self',
          signals: {},
          evidence: [],
          version: 'v1',
          confidence: 0,
        },
        partner: {
          domain: 'partner',
          signals: {},
          evidence: [],
          version: 'v1',
          confidence: 0,
        },
        relationship: {
          domain: 'relationship',
          signals: {},
          evidence: [],
          version: 'v1',
          confidence: 0,
        },
        compatibility: {
          selfVsPartner: {
            overallScore: 0,
            coverage: 0,
            matchedSignals: 0,
            hardMismatches: [],
            breakdown: [],
          },
          selfVsRelationship: {
            overallScore: 0,
            coverage: 0,
            matchedSignals: 0,
            hardMismatches: [],
            breakdown: [],
          },
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
      };

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

    evaluation = this.applySelfSnapshotHgRankingToEvaluationPayload(
      evaluation,
      undefined,
    );

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
      evaluationStatus: undefined,
      evaluatedAt: undefined,
      promptVersion: undefined,
      policyVersion: undefined,
      textHash: undefined,
      signals: undefined,
    };
  }

  private static readonly _HG_RAW_JSON_OMIT_KEYS = [
    'dailyRhythm',
    'autonomyTogethernessDepth',
    'interestsTop3',
    'autonomyTogetherness',
    'interestsTop',
  ] as const;

  private stripHgRankingEnrichmentFromEvaluationBeforePersist(
    evaluation: EvaluateBatchResult,
  ): EvaluateBatchResult {
    const c = JSON.parse(JSON.stringify(evaluation)) as EvaluateBatchResult;
    const en = c.enrichment;
    if (
      !en ||
      en.version !== 'v1' ||
      !en.signals ||
      typeof en.signals !== 'object'
    )
      return c;
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
    const signals = JSON.parse(
      JSON.stringify(c.enrichment!.signals),
    ) as EnrichmentSignalsV1;
    const dr = selfSnap.hgRankingDailyRhythm;
    if (typeof dr === 'string' && dr.trim() !== '') {
      signals.dailyRhythm = dr.trim() as EnrichmentSignalsV1['dailyRhythm'];
    }
    const at = selfSnap.hgRankingAutonomyTogetherness;
    if (typeof at === 'string' && at.trim() !== '') {
      signals.autonomyTogethernessDepth =
        at.trim() as EnrichmentSignalsV1['autonomyTogethernessDepth'];
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
