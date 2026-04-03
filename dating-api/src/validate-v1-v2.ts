/**
 * V1 vs V2 Validation Script
 * 
 * Compares extraction outputs from V1 and V2 on a golden set of profiles.
 * Measures drift in signals, coverage, and validates negatives extraction.
 * 
 * Usage:
 *   npm run validate:v1-v2 [profileId1] [profileId2] ...
 * 
 * If no profileIds provided, uses first 5 profiles from database.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExtractionService } from './extraction/extraction.service';
import { ExtractionV2Service } from './extraction/extraction-v2.service';
import { ProfilesPrismaService } from './profiles/profiles-prisma.service';
import { SimpleLogger } from './logger/simple-logger.service';

interface ValidationResult {
  profileId: string;
  name: string;
  v1: {
    self: Record<string, number | null>;
    partner: Record<string, number | null>;
    relationship: Record<string, number | null>;
    coverage: number;
    avgConfidence: number;
  };
  v2: {
    self: Record<string, number | null>;
    partner: Record<string, number | null>;
    relationship: Record<string, number | null>;
    coverage: number;
    avgConfidence: number;
    negativesCount: { self: number; partner: number; relationship: number };
  };
  drift: {
    self: Record<string, number>; // per-signal drift
    partner: Record<string, number>;
    relationship: Record<string, number>;
    avgDriftPerDomain: { self: number; partner: number; relationship: number };
    overallAvgDrift: number;
  };
  coverageDelta: number; // v2 - v1
  confidenceDelta: number; // v2 - v1
}

function computeSignalDrift(
  v1Signals: Record<string, number | null>,
  v2Signals: Record<string, number | null>,
): { driftMap: Record<string, number>; avgDrift: number } {
  const driftMap: Record<string, number> = {};
  let sum = 0;
  let count = 0;

  for (const key of Object.keys(v1Signals)) {
    const v1Val = v1Signals[key];
    const v2Val = v2Signals[key];

    if (v1Val != null && v2Val != null) {
      const drift = Math.abs(v1Val - v2Val);
      driftMap[key] = drift;
      sum += drift;
      count++;
    }
  }

  const avgDrift = count > 0 ? sum / count : 0;
  return { driftMap, avgDrift };
}

function countNonNull(signals: Record<string, number | null>): number {
  return Object.values(signals).filter((v) => v != null).length;
}

async function validateProfile(
  profileId: string,
  profilesService: ProfilesPrismaService,
  extractionV1Service: ExtractionService,
  extractionV2Service: ExtractionV2Service,
  logger: SimpleLogger,
): Promise<ValidationResult> {
  const profile = await profilesService.getById(profileId);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  logger.log(`[Validation] Running V1 extraction for ${profileId}...`);
  const v1Result = await extractionV1Service.extractAllThree(
    profile.texts.aboutMe,
    profile.texts.aboutRelationship,
    profile.texts.aboutPartner,
    profileId,
  );

  logger.log(`[Validation] Running V2 extraction for ${profileId}...`);
  const v2Result = await extractionV2Service.extractAll(
    profile.texts.aboutMe,
    profile.texts.aboutPartner,
    profile.texts.aboutRelationship,
    profileId,
  );

  // Compute coverage
  const v1TotalNonNull =
    countNonNull(v1Result.self.signals) +
    countNonNull(v1Result.partner.signals) +
    countNonNull(v1Result.relationship.signals);
  const v1Coverage = Math.round((v1TotalNonNull / (14 * 3)) * 100);

  const v2TotalNonNull =
    countNonNull(v2Result.base.self.signals) +
    countNonNull(v2Result.base.partner.signals) +
    countNonNull(v2Result.base.relationship.signals);
  const v2Coverage = Math.round((v2TotalNonNull / (14 * 3)) * 100);

  // Compute drift
  const selfDrift = computeSignalDrift(v1Result.self.signals, v2Result.base.self.signals);
  const partnerDrift = computeSignalDrift(v1Result.partner.signals, v2Result.base.partner.signals);
  const relationshipDrift = computeSignalDrift(
    v1Result.relationship.signals,
    v2Result.base.relationship.signals,
  );

  const overallAvgDrift =
    (selfDrift.avgDrift + partnerDrift.avgDrift + relationshipDrift.avgDrift) / 3;

  const v1AvgConfidence =
    (v1Result.self.confidence + v1Result.partner.confidence + v1Result.relationship.confidence) / 3;
  const v2AvgConfidence =
    (v2Result.base.self.confidence +
      v2Result.base.partner.confidence +
      v2Result.base.relationship.confidence) /
    3;

  return {
    profileId,
    name: profile.name,
    v1: {
      self: v1Result.self.signals,
      partner: v1Result.partner.signals,
      relationship: v1Result.relationship.signals,
      coverage: v1Coverage,
      avgConfidence: Math.round(v1AvgConfidence * 100) / 100,
    },
    v2: {
      self: v2Result.base.self.signals,
      partner: v2Result.base.partner.signals,
      relationship: v2Result.base.relationship.signals,
      coverage: v2Coverage,
      avgConfidence: Math.round(v2AvgConfidence * 100) / 100,
      negativesCount: {
        self: v2Result.negatives.self.length,
        partner: v2Result.negatives.partner.length,
        relationship: v2Result.negatives.relationship.length,
      },
    },
    drift: {
      self: selfDrift.driftMap,
      partner: partnerDrift.driftMap,
      relationship: relationshipDrift.driftMap,
      avgDriftPerDomain: {
        self: Math.round(selfDrift.avgDrift * 100) / 100,
        partner: Math.round(partnerDrift.avgDrift * 100) / 100,
        relationship: Math.round(relationshipDrift.avgDrift * 100) / 100,
      },
      overallAvgDrift: Math.round(overallAvgDrift * 100) / 100,
    },
    coverageDelta: v2Coverage - v1Coverage,
    confidenceDelta: Math.round((v2AvgConfidence - v1AvgConfidence) * 100) / 100,
  };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const profilesService = app.get(ProfilesPrismaService);
  const extractionV1Service = app.get(ExtractionService);
  const extractionV2Service = app.get(ExtractionV2Service);
  const logger = app.get(SimpleLogger);

  // Get profileIds from command line args or use first 5 from DB
  let profileIds: string[] = process.argv.slice(2);

  if (profileIds.length === 0) {
    logger.log('[Validation] No profileIds provided, using first 5 from database...');
    const allProfiles = await profilesService.list();
    profileIds = allProfiles.slice(0, 5).map((p) => p.id);
  }

  logger.log(`[Validation] Validating ${profileIds.length} profiles...`);

  const results: ValidationResult[] = [];

  for (const profileId of profileIds) {
    try {
      const result = await validateProfile(
        profileId,
        profilesService,
        extractionV1Service,
        extractionV2Service,
        logger,
      );
      results.push(result);
    } catch (error) {
      logger.error(`[Validation] Failed to validate ${profileId}: ${error}`);
    }
  }

  // Aggregate statistics
  const avgDrift =
    results.reduce((sum, r) => sum + r.drift.overallAvgDrift, 0) / results.length;
  const avgCoverageDelta =
    results.reduce((sum, r) => sum + r.coverageDelta, 0) / results.length;
  const avgConfidenceDelta =
    results.reduce((sum, r) => sum + r.confidenceDelta, 0) / results.length;

  const maxDrift = Math.max(...results.map((r) => r.drift.overallAvgDrift));
  const minCoverageDelta = Math.min(...results.map((r) => r.coverageDelta));

  const totalNegatives = results.reduce(
    (sum, r) =>
      sum +
      r.v2.negativesCount.self +
      r.v2.negativesCount.partner +
      r.v2.negativesCount.relationship,
    0,
  );

  // Print results
  console.log('\n=== V1 vs V2 VALIDATION REPORT ===\n');
  console.log(`Profiles validated: ${results.length}`);
  console.log(`\n--- Drift Analysis ---`);
  console.log(`Average drift per signal: ${avgDrift.toFixed(2)} points`);
  console.log(`Max drift: ${maxDrift.toFixed(2)} points`);
  console.log(
    `Pass criteria: avg drift ≤ 1.0 → ${avgDrift <= 1.0 ? '✓ PASS' : '✗ FAIL'}`,
  );

  console.log(`\n--- Coverage Analysis ---`);
  console.log(`Average coverage delta: ${avgCoverageDelta.toFixed(1)}%`);
  console.log(`Min coverage delta: ${minCoverageDelta.toFixed(1)}%`);
  console.log(
    `Pass criteria: coverage delta ≥ -10% → ${minCoverageDelta >= -10 ? '✓ PASS' : '✗ FAIL'}`,
  );

  console.log(`\n--- Confidence Analysis ---`);
  console.log(`Average confidence delta: ${avgConfidenceDelta.toFixed(2)}`);

  console.log(`\n--- Negatives Extraction ---`);
  console.log(`Total negatives extracted: ${totalNegatives}`);
  console.log(
    `Average per profile: ${(totalNegatives / results.length).toFixed(1)}`,
  );

  console.log(`\n--- Per-Profile Details ---`);
  for (const result of results) {
    console.log(`\n${result.profileId} (${result.name}):`);
    console.log(`  Drift: ${result.drift.overallAvgDrift} points`);
    console.log(`  Coverage: V1=${result.v1.coverage}%, V2=${result.v2.coverage}%, delta=${result.coverageDelta}%`);
    console.log(`  Confidence: V1=${result.v1.avgConfidence}, V2=${result.v2.avgConfidence}, delta=${result.confidenceDelta}`);
    console.log(
      `  Negatives: self=${result.v2.negativesCount.self}, partner=${result.v2.negativesCount.partner}, relationship=${result.v2.negativesCount.relationship}`,
    );
  }

  console.log(`\n--- Overall Assessment ---`);
  const driftPass = avgDrift <= 1.0;
  const coveragePass = minCoverageDelta >= -10;
  const allPass = driftPass && coveragePass;

  if (allPass) {
    console.log('✓ V2 validation PASSED');
    console.log('V2 extraction is ready for production use.');
  } else {
    console.log('✗ V2 validation FAILED');
    if (!driftPass) console.log('  - Signal drift exceeds threshold');
    if (!coveragePass) console.log('  - Coverage drop exceeds threshold');
    console.log('V2 prompts need tuning before production use.');
  }

  console.log('\n=== END REPORT ===\n');

  await app.close();
  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
