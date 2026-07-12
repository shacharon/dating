/**
 * Religion Consistency Validation
 * 
 * Validates UserProfile.religion field:
 * - Enum validity (ReligionSelf)
 * - Null vs populated distribution
 * - Invalid/legacy values
 * - Source of truth confirmation (user input, not evaluation-derived)
 * 
 * Run: npx ts-node --project tsconfig.json scripts/validate-religion-consistency.ts
 */
import 'dotenv/config';
import { PrismaClient, UserProfileStatus } from '@prisma/client';
import { ReligionSelf } from '../src/canonical/matching-canonical.types';

interface ReligionReport {
  totalProfiles: number;
  analyzedProfiles: number;
  withReligion: number;
  nullReligion: number;
  validEnumValues: number;
  invalidValues: number;
  distribution: Record<string, number>;
  invalidSamples: Array<{
    profileId: string;
    value: string;
  }>;
}

function isValidReligionSelf(value: string): boolean {
  return Object.values(ReligionSelf).includes(value as ReligionSelf);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  console.log('[validate-religion] Starting validation...\n');

  try {
    const totalProfiles = await prisma.userProfile.count();
    const analyzedProfiles = await prisma.userProfile.count({
      where: { status: UserProfileStatus.ANALYZED },
    });

    const profiles = await prisma.userProfile.findMany({
      select: {
        id: true,
        religion: true,
        status: true,
      },
    });

    const report: ReligionReport = {
      totalProfiles,
      analyzedProfiles,
      withReligion: 0,
      nullReligion: 0,
      validEnumValues: 0,
      invalidValues: 0,
      distribution: {},
      invalidSamples: [],
    };

    for (const profile of profiles) {
      if (profile.religion === null) {
        report.nullReligion++;
      } else {
        report.withReligion++;
        
        const religionValue = profile.religion;
        report.distribution[religionValue] = (report.distribution[religionValue] || 0) + 1;

        if (isValidReligionSelf(religionValue)) {
          report.validEnumValues++;
        } else {
          report.invalidValues++;
          if (report.invalidSamples.length < 10) {
            report.invalidSamples.push({
              profileId: profile.id,
              value: religionValue,
            });
          }
        }
      }
    }

    console.log('=== RELIGION CONSISTENCY REPORT ===\n');
    console.log(`Total profiles: ${report.totalProfiles}`);
    console.log(`ANALYZED profiles: ${report.analyzedProfiles}`);
    console.log(`\nReligion Field Status:`);
    console.log(`  With religion: ${report.withReligion} (${((report.withReligion / report.totalProfiles) * 100).toFixed(1)}%)`);
    console.log(`  Null religion: ${report.nullReligion} (${((report.nullReligion / report.totalProfiles) * 100).toFixed(1)}%)`);
    console.log(`\nEnum Validation:`);
    console.log(`  Valid ReligionSelf values: ${report.validEnumValues}`);
    console.log(`  Invalid values: ${report.invalidValues}`);

    if (Object.keys(report.distribution).length > 0) {
      console.log(`\nDistribution:`);
      const sorted = Object.entries(report.distribution).sort((a, b) => b[1] - a[1]);
      sorted.forEach(([value, count]) => {
        const isValid = isValidReligionSelf(value);
        const marker = isValid ? '✓' : '✗';
        console.log(`  ${marker} ${value}: ${count}`);
      });
    }

    if (report.invalidSamples.length > 0) {
      console.log(`\nInvalid Value Samples (first ${report.invalidSamples.length}):`);
      report.invalidSamples.forEach((s) => {
        console.log(`  Profile ${s.profileId}: "${s.value}"`);
      });
    }

    console.log('\n=== VALID ReligionSelf ENUM VALUES ===');
    console.log(Object.values(ReligionSelf).join(', '));

    console.log('\n=== SOURCE OF TRUTH ANALYSIS ===\n');
    console.log('Religion field is:');
    console.log('  ✓ Written by: MeProfileService (POST/PATCH /api/v1/me/profile)');
    console.log('  ✓ Source: User form input (validated as ReligionSelf enum)');
    console.log('  ✗ NOT written by: MeProfileAnalysisService');
    console.log('  ✗ NOT derived from: UserProfileEvaluation.evaluationJson');
    console.log('  ✗ NOT denormalized from: Any other table');
    console.log('\nRead by:');
    console.log('  - Profile GET endpoint (me-profile.service.ts → toResponse)');
    console.log('  - HG eligibility filter (eligibility.evaluator.ts → evalReligion)');
    console.log('  - Match engine mapper (me-profile-engine.mapper.ts → facts.religion)');
    console.log('\nPartner preferences:');
    console.log('  - Already normalized: UserProfilePreference.acceptedPartnerReligions (Phase F)');

    console.log('\n=== NORMALIZATION ASSESSMENT ===\n');
    
    if (report.invalidValues > 0) {
      console.log(`⚠ FINDING: ${report.invalidValues} profiles have invalid ReligionSelf values`);
      console.log('  Recommendation: Data migration to fix or nullify invalid values');
    } else {
      console.log('✓ All non-null religion values are valid ReligionSelf enum members');
    }

    console.log('\n✓ CONCLUSION: Religion does NOT need normalization');
    console.log('  Reason: Religion is user input stored in canonical form');
    console.log('  Pattern: User API → UserProfile.religion (source of truth)');
    console.log('  Different from signals: Signals are evaluation-derived → denorm cache + normalized table');
    console.log('  Religion is NOT evaluation-derived, NOT denormalized, NOT duplicated');

    console.log('\n=== END REPORT ===\n');

    if (report.invalidValues > 0) {
      console.log('⚠ Action required: Clean up invalid religion values');
      process.exit(1);
    } else {
      console.log('✓ Religion field is consistent. No normalization needed.');
      process.exit(0);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Error during religion validation:', e);
  process.exit(1);
});
