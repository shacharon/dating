/**
 * Legacy profile read stubs for admin/compare paths.
 * MatchmakingProfile reads disabled (slice 8); product path uses MeProfileModule.
 */

import { Injectable } from '@nestjs/common';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate-public-api';
import {
  sanitizeEnrichmentSignalsV1ForPersist,
  wrapEnrichmentV1,
  type EnrichmentSignalsV1,
} from '../evaluate/enrichment-signals';
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

@Injectable()
export class ProfilesPrismaService {
  constructor(private readonly logger: SimpleLogger) {
    this.logger.log(
      'ProfilesPrismaService: DB-only mode enabled',
      'ProfilesPrismaService',
    );
  }

  /** Get profile by id from PostgreSQL (legacy stub — always null). */
  async getById(id: string): Promise<ProfileJsonPayload | null> {
    const dbRow = await this.getFromPrisma(id);
    if (!dbRow) return null;
    return this.rowToPayload(dbRow);
  }

  /** List all profiles from PostgreSQL (legacy stub — always empty). */
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
      display: {
        overallNarrative: 'Not analyzed yet.',
        aboutMeInsight: '',
        relationshipInsight: '',
        partnerInsight: '',
        missingPrompts: [
          'What would you like a future partner to understand about you?',
          'What relationship rhythm feels healthy and sustainable for you?',
        ],
        summary: 'Not analyzed yet.',
        insight: '',
      },
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
