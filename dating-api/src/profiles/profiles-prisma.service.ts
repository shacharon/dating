/**
 * Prisma-backed profile storage with evaluation persistence.
 * DB-only behavior (no JSON fallback).
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SimpleLogger } from '../logger/simple-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import { sanitizeEnrichmentSignalsV1ForPersist, wrapEnrichmentV1 } from '../evaluate/enrichment-signals';
import type { ProfileJsonPayload, ProfileListItem } from './profiles-json.service';

interface UserProfileRow {
  id: string;
  name: string;
  aboutMe: string;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  createdAt: Date;
  updatedAt: Date;
  evaluationRaw?: { evaluation: unknown } | null;
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
    const evaluationJson = evaluation as unknown as Prisma.InputJsonValue;
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

      await tx.profileSignalSnapshot.createMany({
        data: [
          this.toSignalSnapshotRow(id, 'self', selfSignals),
          this.toSignalSnapshotRow(id, 'partner', partnerSignals),
          this.toSignalSnapshotRow(id, 'relationship', relationshipSignals),
        ],
      });

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
    };

    if (!signals) return row;

    for (const key of SIGNAL_KEYS) {
      if (Object.prototype.hasOwnProperty.call(signals, key)) {
        const value = signals[key];
        row[key] = typeof value === 'number' ? value : null;
      }
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
}
