/**
 * Canonical profile query repository.
 * Query-optimized functions using canonical array columns (no JSON parsing).
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SimpleLogger } from '../logger/simple-logger.service';

export interface FindByPreferencesInput {
  includeInterests?: string[];
  excludeInterests?: string[];
  minRelationshipClaritySelf?: number;
  minRelationshipClarityPartner?: number;
  minRelationshipClarityRelationship?: number;
  excludeHardNo?: string[];
  limit?: number;
}

export interface ProfilePreferenceMatch {
  profileId: string;
  interests_self: string[];
  negatives_self: string[];
  hard_no: string[];
  soft_no: string[];
  relationship_clarity_self: number | null;
  relationship_clarity_partner: number | null;
  relationship_clarity_relationship: number | null;
  coverageScore: number;
  avgConfidence: number;
}

@Injectable()
export class CanonicalProfileRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Find profiles by canonical preferences using array and signal scalar columns.
   * Uses GIN indexes on interests_self and negatives_self for fast array containment.
   * Uses scalar columns for signal thresholds (no JSON operators).
   */
  async findByPreferences(
    input: FindByPreferencesInput,
  ): Promise<ProfilePreferenceMatch[]> {
    void this.prisma;
    const {
      includeInterests = [],
      excludeInterests = [],
      minRelationshipClaritySelf,
      minRelationshipClarityPartner,
      minRelationshipClarityRelationship,
      excludeHardNo = [],
      limit = 100,
    } = input;

    this.logger.log(
      JSON.stringify({
        event: 'canonical_query_start',
        includeInterests,
        excludeInterests,
        minRelationshipClaritySelf,
        minRelationshipClarityPartner,
        minRelationshipClarityRelationship,
        excludeHardNo,
        limit,
      }),
      CanonicalProfileRepository.name,
    );

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions for array columns (GIN index optimized)
    for (const tag of includeInterests) {
      conditions.push(`$${paramIndex} = ANY("interests_self")`);
      params.push(tag.toLowerCase().trim());
      paramIndex++;
    }

    for (const tag of excludeInterests) {
      conditions.push(`NOT ($${paramIndex} = ANY("interests_self"))`);
      params.push(tag.toLowerCase().trim());
      paramIndex++;
    }

    for (const tag of excludeHardNo) {
      conditions.push(`NOT ($${paramIndex} = ANY("hard_no"))`);
      params.push(tag.toLowerCase().trim());
      paramIndex++;
    }

    // Build WHERE conditions for signal scalar columns (no JSON operators)
    if (minRelationshipClaritySelf !== undefined) {
      conditions.push(`"relationship_clarity_self" >= $${paramIndex}`);
      params.push(minRelationshipClaritySelf);
      paramIndex++;
    }

    if (minRelationshipClarityPartner !== undefined) {
      conditions.push(`"relationship_clarity_partner" >= $${paramIndex}`);
      params.push(minRelationshipClarityPartner);
      paramIndex++;
    }

    if (minRelationshipClarityRelationship !== undefined) {
      conditions.push(`"relationship_clarity_relationship" >= $${paramIndex}`);
      params.push(minRelationshipClarityRelationship);
      paramIndex++;
    }

    void conditions;
    void params;
    void paramIndex;
    void limit;

    this.logger.warn(
      JSON.stringify({
        event: 'canonical_query_disabled',
        reason: 'slice2_stop_profile_extraction_v2_runtime_reads',
      }),
      CanonicalProfileRepository.name,
    );

    const results: ProfilePreferenceMatch[] = [];

    this.logger.log(
      JSON.stringify({
        event: 'canonical_query_complete',
        matchCount: results.length,
      }),
      CanonicalProfileRepository.name,
    );

    return results;
  }
}
