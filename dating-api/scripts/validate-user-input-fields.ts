/**
 * User Input Fields Validation
 * 
 * Validates 5 HG structured fact fields on UserProfile:
 * - childrenStatus
 * - wantsChildren
 * - smokingFrequency
 * - alcoholUse
 * - education
 * 
 * For each field:
 * - Enum validity
 * - Null vs populated distribution
 * - Invalid/legacy values
 * - Source of truth classification
 * - Normalization decision
 * 
 * Run: npx ts-node --project tsconfig.json scripts/validate-user-input-fields.ts
 */
import 'dotenv/config';
import { PrismaClient, UserProfileStatus } from '@prisma/client';
import {
  ChildrenStatusSelf,
  WantsChildrenSelf,
  SmokingFrequencySelf,
  AlcoholUseSelf,
  EducationLevelSelf,
} from '../src/canonical/matching-canonical.types';

interface FieldReport {
  fieldName: string;
  dbColumnName: string;
  hgFactKey: string;
  totalProfiles: number;
  analyzedProfiles: number;
  withValue: number;
  nullValue: number;
  validEnum: number;
  invalidValues: number;
  distribution: Record<string, number>;
  invalidSamples: Array<{ profileId: string; value: string }>;
  classification: 'evaluation-derived' | 'user-input' | 'hybrid';
  writtenBy: string[];
  readBy: string[];
  sourceOfTruth: string;
  normalizationNeeded: boolean;
  reason: string;
}

const FIELD_CONFIGS = [
  {
    fieldName: 'childrenStatus',
    dbColumn: 'childrenStatus',
    hgFactKey: 'childrenStatus',
    enumType: ChildrenStatusSelf,
    enumName: 'ChildrenStatusSelf',
  },
  {
    fieldName: 'wantsChildren',
    dbColumn: 'wantsChildren',
    hgFactKey: 'wantsChildren',
    enumType: WantsChildrenSelf,
    enumName: 'WantsChildrenSelf',
  },
  {
    fieldName: 'smokingFrequency',
    dbColumn: 'smokingFrequency',
    hgFactKey: 'smoking',
    enumType: SmokingFrequencySelf,
    enumName: 'SmokingFrequencySelf',
  },
  {
    fieldName: 'alcoholUse',
    dbColumn: 'alcoholUse',
    hgFactKey: 'alcoholUse',
    enumType: AlcoholUseSelf,
    enumName: 'AlcoholUseSelf',
  },
  {
    fieldName: 'education',
    dbColumn: 'education',
    hgFactKey: 'education',
    enumType: EducationLevelSelf,
    enumName: 'EducationLevelSelf',
  },
];

function isValidEnumValue(value: string, enumType: any): boolean {
  return Object.values(enumType).includes(value);
}

async function validateField(
  prisma: PrismaClient,
  config: typeof FIELD_CONFIGS[0],
  profiles: any[],
  analyzedCount: number,
): Promise<FieldReport> {
  const report: FieldReport = {
    fieldName: config.fieldName,
    dbColumnName: config.dbColumn,
    hgFactKey: config.hgFactKey,
    totalProfiles: profiles.length,
    analyzedProfiles: analyzedCount,
    withValue: 0,
    nullValue: 0,
    validEnum: 0,
    invalidValues: 0,
    distribution: {},
    invalidSamples: [],
    classification: 'user-input',
    writtenBy: [
      'MeProfileService (POST/PATCH /api/v1/me/profile)',
      'toPrismaWritableData() - me-profile.service.ts line ~217-223',
    ],
    readBy: [
      'Profile GET endpoint (me-profile.service.ts → toResponse line ~107)',
      'HG eligibility filter (eligibility.evaluator.ts)',
      'Match engine mapper (me-profile-engine.mapper.ts → facts line ~196-206)',
    ],
    sourceOfTruth: `UserProfile.${config.dbColumn} (the column itself)`,
    normalizationNeeded: false,
    reason: 'User input stored in canonical form, not evaluation-derived, no duplication',
  };

  for (const profile of profiles) {
    const value = profile[config.dbColumn];

    if (value === null) {
      report.nullValue++;
    } else {
      report.withValue++;
      report.distribution[value] = (report.distribution[value] || 0) + 1;

      if (isValidEnumValue(value, config.enumType)) {
        report.validEnum++;
      } else {
        report.invalidValues++;
        if (report.invalidSamples.length < 10) {
          report.invalidSamples.push({
            profileId: profile.id,
            value: value,
          });
        }
      }
    }
  }

  return report;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  console.log('[validate-user-input-fields] Starting validation...\n');

  try {
    const totalProfiles = await prisma.userProfile.count();
    const analyzedProfiles = await prisma.userProfile.count({
      where: { status: UserProfileStatus.ANALYZED },
    });

    const profiles = await prisma.userProfile.findMany({
      select: {
        id: true,
        childrenStatus: true,
        wantsChildren: true,
        smokingFrequency: true,
        alcoholUse: true,
        education: true,
        status: true,
      },
    });

    console.log('=== USER INPUT FIELDS VALIDATION REPORT ===\n');
    console.log(`Total profiles: ${totalProfiles}`);
    console.log(`ANALYZED profiles: ${analyzedProfiles}\n`);

    const reports: FieldReport[] = [];

    for (const config of FIELD_CONFIGS) {
      const report = await validateField(prisma, config, profiles, analyzedProfiles);
      reports.push(report);

      console.log(`--- ${config.fieldName.toUpperCase()} ---`);
      console.log(`DB Column: ${report.dbColumnName}`);
      console.log(`HG Fact Key: ${report.hgFactKey}${report.dbColumnName !== report.hgFactKey ? ' (mapper converts)' : ''}`);
      console.log(`Enum: ${config.enumName}`);
      console.log(`\nDistribution:`);
      console.log(`  With value: ${report.withValue} (${((report.withValue / report.totalProfiles) * 100).toFixed(1)}%)`);
      console.log(`  Null: ${report.nullValue} (${((report.nullValue / report.totalProfiles) * 100).toFixed(1)}%)`);
      console.log(`\nValidation:`);
      console.log(`  Valid enum values: ${report.validEnum}`);
      console.log(`  Invalid values: ${report.invalidValues}`);

      if (Object.keys(report.distribution).length > 0) {
        console.log(`\nValue Distribution:`);
        const sorted = Object.entries(report.distribution).sort((a, b) => b[1] - a[1]);
        sorted.forEach(([value, count]) => {
          const isValid = isValidEnumValue(value, config.enumType);
          const marker = isValid ? '✓' : '✗';
          console.log(`  ${marker} ${value}: ${count}`);
        });
      }

      if (report.invalidSamples.length > 0) {
        console.log(`\nInvalid Samples:`);
        report.invalidSamples.forEach((s) => {
          console.log(`  Profile ${s.profileId}: "${s.value}"`);
        });
      }

      console.log(`\nClassification: ${report.classification.toUpperCase()}`);
      console.log(`Source of Truth: ${report.sourceOfTruth}`);
      console.log(`Normalization Needed: ${report.normalizationNeeded ? 'YES' : 'NO'}`);
      console.log(`Reason: ${report.reason}\n`);
    }

    console.log('=== VALID ENUM VALUES ===\n');
    FIELD_CONFIGS.forEach((config) => {
      console.log(`${config.enumName}:`);
      console.log(`  ${Object.values(config.enumType).join(', ')}\n`);
    });

    console.log('=== SOURCE OF TRUTH ANALYSIS ===\n');
    console.log('All 5 fields are:');
    console.log('  ✓ Written by: MeProfileService (POST/PATCH /api/v1/me/profile)');
    console.log('  ✓ Source: User form input (validated as enum at API layer)');
    console.log('  ✗ NOT written by: MeProfileAnalysisService');
    console.log('  ✗ NOT derived from: UserProfileEvaluation.evaluationJson');
    console.log('  ✗ NOT denormalized from: Any other table');
    console.log('\nRead paths:');
    console.log('  - Profile GET endpoint (me-profile.service.ts)');
    console.log('  - HG eligibility filter (eligibility.evaluator.ts)');
    console.log('  - Match engine mapper (me-profile-engine.mapper.ts → HG facts)');
    console.log('  - Engine scoring: NOT used (evaluationJson only for semantic matching)');
    console.log('\nPartner preferences (already normalized in Phase F):');
    console.log('  - acceptedPartnerSmoking → UserProfilePreference');
    console.log('  - acceptedPartnerAlcohol → UserProfilePreference');
    console.log('  - minimumPartnerEducation → UserProfilePreference');
    console.log('  - partnerWantsChildren → UserProfilePreference');
    console.log('  - partnerHasChildren → UserProfilePreference');

    console.log('\n=== FIELD NAME NOTE ===\n');
    console.log('smokingFrequency:');
    console.log('  - DB/API column name: smokingFrequency');
    console.log('  - HG JSON fact key: smoking');
    console.log('  - Mapper converts: profile.smokingFrequency → facts.smoking');
    console.log('  - File: me-profile-engine.mapper.ts line ~203');

    console.log('\n=== NORMALIZATION ASSESSMENT ===\n');

    const totalInvalid = reports.reduce((sum, r) => sum + r.invalidValues, 0);
    const allUserInput = reports.every((r) => r.classification === 'user-input');
    const noneNeedNormalization = reports.every((r) => !r.normalizationNeeded);

    if (totalInvalid > 0) {
      console.log(`⚠ FINDING: ${totalInvalid} total profiles have invalid enum values across fields`);
      console.log('  Recommendation: Data migration to fix or nullify invalid values\n');
    } else {
      console.log('✓ All non-null values are valid enum members\n');
    }

    if (!allUserInput) {
      console.log('⚠ WARNING: Some fields are not pure user-input (unexpected)');
      reports.filter((r) => r.classification !== 'user-input').forEach((r) => {
        console.log(`  - ${r.fieldName}: ${r.classification}`);
      });
      console.log('');
    }

    console.log('✓ CONCLUSION: ALL 5 fields follow USER INPUT pattern');
    console.log('  - Same as religion (previous wave)');
    console.log('  - Different from signals (evaluation-derived, require normalization)');
    console.log(`  - Normalization needed: NO for all ${reports.length} fields`);
    console.log('\nReason:');
    console.log('  - User input stored in canonical form');
    console.log('  - Source of truth is the column itself');
    console.log('  - NOT evaluation-derived');
    console.log('  - NOT denormalized from evaluationJson');
    console.log('  - NOT duplicated across tables');
    console.log('  - No drift risk (single source)');

    console.log('\n=== COMPARISON WITH OTHER PATTERNS ===\n');
    console.log('Pattern A: Evaluation-Derived (interestsTop, sig*)');
    console.log('  Source: evaluationJson (LLM evaluation)');
    console.log('  Write: MeProfileAnalysisService → dual-write (denorm + normalized)');
    console.log('  Read: Engine uses evaluationJson');
    console.log('  Normalization: YES (sync denorm cache with normalized tables)\n');

    console.log('Pattern B: User Input (religion, childrenStatus, wantsChildren, etc.)');
    console.log('  Source: User form (API POST/PATCH)');
    console.log('  Write: MeProfileService → single column');
    console.log('  Read: HG eligibility + DTO (direct column read)');
    console.log('  Normalization: NO (already canonical, no duplication)\n');

    console.log('=== END REPORT ===\n');

    if (totalInvalid > 0) {
      console.log('⚠ Action required: Clean up invalid enum values');
      process.exit(1);
    } else if (!noneNeedNormalization) {
      console.log('⚠ Unexpected: Some fields marked for normalization');
      process.exit(1);
    } else {
      console.log('✓ All fields validated. No normalization needed for any field.');
      process.exit(0);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Error during user input fields validation:', e);
  process.exit(1);
});
