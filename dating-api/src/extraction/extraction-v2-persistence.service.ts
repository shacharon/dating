/**
 * V2 extraction persistence service.
 * Handles storage and retrieval of ProfileExtractionV2 records.
 */

import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { ExtractionV2Result } from '../extraction/extraction-v2.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { projectToCanonical } from '../canonical/canonical-projection';

const PROMPT_VERSION_V2 = 'v2_9call_20260328';

export interface ExtractionV2PersistInput {
  profileId: string;
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
  extraction: ExtractionV2Result;
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

    // Project to canonical arrays and signal scalars
    const canonical = projectToCanonical(extraction);

    this.logger.log(
      JSON.stringify({
        event: 'extraction_v2_persist',
        profileId,
        coverageScore,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        textHash,
        canonical: {
          interests_self: canonical.interests_self.length,
          interests_partner: canonical.interests_partner.length,
          negatives_self: canonical.negatives_self.length,
          negatives_partner: canonical.negatives_partner.length,
          soft_no: canonical.soft_no.length,
          hard_no: canonical.hard_no.length,
          relationship_clarity_self: canonical.relationship_clarity_self,
          relationship_clarity_partner: canonical.relationship_clarity_partner,
          relationship_clarity_relationship: canonical.relationship_clarity_relationship,
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
        interests_self: canonical.interests_self,
        interests_partner: canonical.interests_partner,
        negatives_self: canonical.negatives_self,
        negatives_partner: canonical.negatives_partner,
        soft_no: canonical.soft_no,
        hard_no: canonical.hard_no,
        relationship_clarity_self: canonical.relationship_clarity_self,
        relationship_clarity_partner: canonical.relationship_clarity_partner,
        relationship_clarity_relationship: canonical.relationship_clarity_relationship,
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
        interests_self: canonical.interests_self,
        interests_partner: canonical.interests_partner,
        negatives_self: canonical.negatives_self,
        negatives_partner: canonical.negatives_partner,
        soft_no: canonical.soft_no,
        hard_no: canonical.hard_no,
        relationship_clarity_self: canonical.relationship_clarity_self,
        relationship_clarity_partner: canonical.relationship_clarity_partner,
        relationship_clarity_relationship: canonical.relationship_clarity_relationship,
      },
    });
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
