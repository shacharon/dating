/**
 * V2 extraction persistence service.
 * Handles storage and retrieval of ProfileExtractionV2 records.
 */

import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { ExtractionV2Result } from '../extraction/extraction-v2.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { projectToCanonicalArrays, projectToCanonicalSignalScalars } from '../canonical/canonical-projection';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import { syncProfileHgRankingSignalColumns } from '../holy-grail-matching/holy-grail-ranking-signals-sync';

const PROMPT_VERSION_V2 = 'v2_9call_20260328';

export interface ExtractionV2PersistInput {
  profileId: string;
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
  extraction: ExtractionV2Result;
}

function normalizeExtendedList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const normalized = item
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) continue;
    if (normalized.length > 200) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= 50) break;
  }
  return out;
}

@Injectable()
export class ExtractionV2PersistenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Compute text hash for cache key.
   */
  hashTexts(aboutMe: string, aboutPartner: string, aboutRelationship: string): string {
    const concat = `${aboutMe}|${aboutPartner}|${aboutRelationship}`;
    return createHash('sha256').update(concat, 'utf8').digest('hex').slice(0, 16);
  }

  /**
   * Save V2 extraction result to database.
   */
  async save(input: ExtractionV2PersistInput): Promise<void> {
    const { profileId, aboutMe, aboutPartner, aboutRelationship, extraction } = input;

    const textHash = this.hashTexts(aboutMe, aboutPartner, aboutRelationship);

    // Calculate coverage score (same logic as V1)
    const totalKeys = 14 * 3; // 14 official signals × 3 domains
    const nonNullCount = 
      Object.values(extraction.base.self.signals).filter(v => v != null).length +
      Object.values(extraction.base.partner.signals).filter(v => v != null).length +
      Object.values(extraction.base.relationship.signals).filter(v => v != null).length;
    const coverageScore = totalKeys > 0 ? Math.round((100 * nonNullCount) / totalKeys) : 0;

    const avgConfidence = 
      (extraction.base.self.confidence +
       extraction.base.partner.confidence +
       extraction.base.relationship.confidence) / 3;

    // Project to canonical arrays and signal scalars (source of truth for DB writes)
    const canonicalArrays = projectToCanonicalArrays(extraction);
    const scalars = projectToCanonicalSignalScalars(extraction);
    this.logger.debug(
      JSON.stringify({
        event: 'self_relationship_clarity_trace',
        stage: 'projectToCanonicalSignalScalars',
        profileId,
        extraction_self_relationshipClarity:
          extraction.base.self.signals.relationshipClarity ?? null,
        canonical_relationship_clarity_self: scalars.relationship_clarity_self,
      }),
    );

    this.logger.debug(
      'canonical_scalars_written',
      JSON.stringify({ profileId, scalars }),
    );

    this.logger.log(
      JSON.stringify({
        event: 'extraction_v2_persist',
        profileId,
        coverageScore,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        textHash,
        canonical: {
          interests_self: canonicalArrays.interests_self.length,
          interests_partner: canonicalArrays.interests_partner.length,
          negatives_self: canonicalArrays.negatives_self.length,
          negatives_partner: canonicalArrays.negatives_partner.length,
          soft_no: canonicalArrays.soft_no.length,
          hard_no: canonicalArrays.hard_no.length,
          relationship_clarity_self: scalars.relationship_clarity_self,
          relationship_clarity_partner: scalars.relationship_clarity_partner,
          relationship_clarity_relationship: scalars.relationship_clarity_relationship,
        },
      }),
      ExtractionV2PersistenceService.name,
    );

    await this.prisma.profileExtractionV2.upsert({
      where: { profileId },
      create: {
        profileId,
        promptVersion: PROMPT_VERSION_V2,
        textHash,
        extractionJson: extraction as any,
        selfSignals: extraction.base.self.signals as any,
        partnerSignals: extraction.base.partner.signals as any,
        relationshipSignals: extraction.base.relationship.signals as any,
        coverageScore,
        avgConfidence,
        interests_self: canonicalArrays.interests_self,
        interests_partner: canonicalArrays.interests_partner,
        negatives_self: canonicalArrays.negatives_self,
        negatives_partner: canonicalArrays.negatives_partner,
        soft_no: canonicalArrays.soft_no,
        hard_no: canonicalArrays.hard_no,
        relationship_clarity_self: scalars.relationship_clarity_self,
        relationship_clarity_partner: scalars.relationship_clarity_partner,
        relationship_clarity_relationship: scalars.relationship_clarity_relationship,
      },
      update: {
        promptVersion: PROMPT_VERSION_V2,
        textHash,
        extractionJson: extraction as any,
        selfSignals: extraction.base.self.signals as any,
        partnerSignals: extraction.base.partner.signals as any,
        relationshipSignals: extraction.base.relationship.signals as any,
        coverageScore,
        avgConfidence,
        extractedAt: extraction.extractedAt,
        updatedAt: new Date(),
        interests_self: canonicalArrays.interests_self,
        interests_partner: canonicalArrays.interests_partner,
        negatives_self: canonicalArrays.negatives_self,
        negatives_partner: canonicalArrays.negatives_partner,
        soft_no: canonicalArrays.soft_no,
        hard_no: canonicalArrays.hard_no,
        relationship_clarity_self: scalars.relationship_clarity_self,
        relationship_clarity_partner: scalars.relationship_clarity_partner,
        relationship_clarity_relationship: scalars.relationship_clarity_relationship,
      },
    });

    const persisted = await this.prisma.profileExtractionV2.findUnique({
      where: { profileId },
      select: { relationship_clarity_self: true },
    });
    this.logger.debug(
      JSON.stringify({
        event: 'self_relationship_clarity_trace',
        stage: 'persisted',
        profileId,
        relationship_clarity_self: persisted?.relationship_clarity_self ?? null,
      }),
    );

    await syncProfileHgRankingSignalColumns(this.prisma, profileId);
  }

  /**
   * Persist extendedSignals canonical arrays from evaluation into ProfileExtractionV2.
   * Persistence-only side channel: does not affect scoring/API.
   */
  async saveExtendedSignalsFromEvaluation(input: {
    profileId: string;
    aboutMe: string;
    aboutPartner: string;
    aboutRelationship: string;
    evaluation: EvaluateBatchResult;
  }): Promise<void> {
    const { profileId, aboutMe, aboutPartner, aboutRelationship, evaluation } = input;
    const textHash = this.hashTexts(aboutMe, aboutPartner, aboutRelationship);
    const ext = evaluation.extendedSignals;

    const interests = normalizeExtendedList(ext?.interests);
    const lifestyleTraits = normalizeExtendedList(ext?.lifestyleTraits);
    const preferences = normalizeExtendedList(ext?.preferences);
    const boundaries = normalizeExtendedList(ext?.boundaries);
    const values = normalizeExtendedList(ext?.values);

    const avgConfidence =
      (evaluation.self.confidence +
        evaluation.partner.confidence +
        evaluation.relationship.confidence) / 3;

    await this.prisma.profileExtractionV2.upsert({
      where: { profileId },
      create: {
        profileId,
        promptVersion: PROMPT_VERSION_V2,
        textHash,
        extractionJson: {} as any,
        selfSignals: evaluation.self.signals as any,
        partnerSignals: evaluation.partner.signals as any,
        relationshipSignals: evaluation.relationship.signals as any,
        coverageScore: evaluation.productScores.coverageScore,
        avgConfidence,
        interests_self: [],
        interests_partner: [],
        negatives_self: [],
        negatives_partner: [],
        soft_no: [],
        hard_no: [],
        interests,
        lifestyleTraits,
        preferences,
        boundaries,
        values,
      },
      update: {
        textHash,
        selfSignals: evaluation.self.signals as any,
        partnerSignals: evaluation.partner.signals as any,
        relationshipSignals: evaluation.relationship.signals as any,
        coverageScore: evaluation.productScores.coverageScore,
        avgConfidence,
        interests,
        lifestyleTraits,
        preferences,
        boundaries,
        values,
        updatedAt: new Date(),
      },
    });

    await syncProfileHgRankingSignalColumns(this.prisma, profileId);
  }

  /**
   * Retrieve V2 extraction by profile ID.
   */
  async getByProfileId(profileId: string): Promise<ExtractionV2Result | null> {
    const record = await this.prisma.profileExtractionV2.findUnique({
      where: { profileId },
    });

    if (!record) return null;

    return record.extractionJson as unknown as ExtractionV2Result;
  }

  /**
   * Check if V2 extraction exists for profile.
   */
  async exists(profileId: string): Promise<boolean> {
    const count = await this.prisma.profileExtractionV2.count({
      where: { profileId },
    });
    return count > 0;
  }
}
