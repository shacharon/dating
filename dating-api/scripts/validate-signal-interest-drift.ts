/**
 * Signal & Interest Drift Validation
 * 
 * Validates sync between:
 * - UserProfile denorm columns (interestsTop, sig*)
 * - UserProfileSignal normalized table
 * - UserProfileInterest normalized table
 * - UserProfileEvaluation.evaluationJson (source of truth)
 * 
 * Run: npx ts-node --project tsconfig.json scripts/validate-signal-interest-drift.ts [--limit N]
 */
import 'dotenv/config';
import { PrismaClient, UserProfileStatus } from '@prisma/client';

type SignalKey =
  | 'emotionalDepth'
  | 'lifestylePace'
  | 'conflictStyle'
  | 'independence'
  | 'socialBattery';

const SIGNAL_KEYS: readonly SignalKey[] = [
  'emotionalDepth',
  'lifestylePace',
  'conflictStyle',
  'independence',
  'socialBattery',
];

interface DriftReport {
  totalAnalyzed: number;
  profilesChecked: number;
  signalDrift: number;
  interestDrift: number;
  casingDrift: number;
  missingDenorm: number;
  missingNormalized: number;
  samples: Array<{
    profileId: string;
    driftType: string;
    details: string;
  }>;
}

function toNullableSignalInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 10) return null;
  return rounded;
}

function pickTopInterests(evaluationJson: unknown): string[] {
  if (!evaluationJson || typeof evaluationJson !== 'object') return [];
  const root = evaluationJson as Record<string, unknown>;
  const enrichment = root.enrichment as Record<string, unknown> | undefined;
  const enrichmentSignals = enrichment?.signals as Record<string, unknown> | undefined;
  const fromEnrichment = enrichmentSignals?.interestsTop3;
  const extendedSignals = root.extendedSignals as Record<string, unknown> | undefined;
  const fromExtended = extendedSignals?.interests;
  const self = root.self as Record<string, unknown> | undefined;
  const fromRaw = self?.rawInterests;

  const candidate = [fromEnrichment, fromExtended, fromRaw].find((v) =>
    Array.isArray(v) && v.length > 0,
  );
  if (!candidate) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of candidate as unknown[]) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= 3) break;
  }
  return out;
}

function extractSignalMap(evaluationJson: unknown): Partial<Record<SignalKey, number>> {
  if (!evaluationJson || typeof evaluationJson !== 'object') return {};
  const root = evaluationJson as Record<string, unknown>;
  const self = root.self as Record<string, unknown> | undefined;
  const signals = self?.signals as Record<string, unknown> | undefined;
  if (!signals) return {};

  const out: Partial<Record<SignalKey, number>> = {};
  for (const key of SIGNAL_KEYS) {
    const v = toNullableSignalInt(signals[key]);
    if (v !== null) out[key] = v;
  }
  return out;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || undefined : undefined;

  console.log(`[validate-drift] Starting validation${limit ? ` (limit: ${limit})` : ''}...`);

  try {
    const profiles = await prisma.userProfile.findMany({
      where: { status: UserProfileStatus.ANALYZED },
      select: {
        id: true,
        interestsTop: true,
        sigEmotionalDepth: true,
        sigLifestylePace: true,
        sigConflictStyle: true,
        sigIndependence: true,
        sigSocialBattery: true,
        evaluations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            evaluationJson: true,
          },
        },
        signals: {
          select: {
            signalKey: true,
            signalValue: true,
          },
        },
        interests: {
          orderBy: { rank: 'asc' },
          take: 3,
          select: {
            tag: true,
          },
        },
      },
      take: limit,
    });

    const report: DriftReport = {
      totalAnalyzed: await prisma.userProfile.count({
        where: { status: UserProfileStatus.ANALYZED },
      }),
      profilesChecked: profiles.length,
      signalDrift: 0,
      interestDrift: 0,
      casingDrift: 0,
      missingDenorm: 0,
      missingNormalized: 0,
      samples: [],
    };

    for (const profile of profiles) {
      const latestEval = profile.evaluations[0];
      if (!latestEval) {
        report.samples.push({
          profileId: profile.id,
          driftType: 'missing_evaluation',
          details: 'ANALYZED profile has no evaluation rows',
        });
        continue;
      }

      const expectedSignals = extractSignalMap(latestEval.evaluationJson);
      const expectedInterests = pickTopInterests(latestEval.evaluationJson);

      let hasSignalDrift = false;
      let hasDenormMissing = false;
      let hasNormalizedMissing = false;

      for (const key of SIGNAL_KEYS) {
        const expected = expectedSignals[key] ?? null;
        const denormKey = `sig${key.charAt(0).toUpperCase()}${key.slice(1)}` as
          | 'sigEmotionalDepth'
          | 'sigLifestylePace'
          | 'sigConflictStyle'
          | 'sigIndependence'
          | 'sigSocialBattery';
        const denormValue = profile[denormKey];
        const normalizedSignal = profile.signals.find((s) => s.signalKey === key);
        const normalizedValue = normalizedSignal?.signalValue ?? null;

        if (expected !== denormValue) {
          hasSignalDrift = true;
          hasDenormMissing = true;
          if (report.samples.length < 10) {
            report.samples.push({
              profileId: profile.id,
              driftType: 'signal_denorm_mismatch',
              details: `${key}: expected ${expected}, denorm ${denormValue}`,
            });
          }
        }

        if (expected !== normalizedValue) {
          hasSignalDrift = true;
          hasNormalizedMissing = true;
          if (report.samples.length < 10) {
            report.samples.push({
              profileId: profile.id,
              driftType: 'signal_normalized_mismatch',
              details: `${key}: expected ${expected}, normalized ${normalizedValue}`,
            });
          }
        }
      }

      if (hasSignalDrift) report.signalDrift++;
      if (hasDenormMissing) report.missingDenorm++;
      if (hasNormalizedMissing) report.missingNormalized++;

      const denormInterests = profile.interestsTop;
      const normalizedInterests = profile.interests.map((i) => i.tag);

      const expectedLower = expectedInterests.map((i) => i.toLowerCase());
      const denormLower = denormInterests.map((i) => i.toLowerCase());
      const normalizedLower = normalizedInterests.map((i) => i.toLowerCase());

      const interestsMatch =
        expectedLower.length === denormLower.length &&
        expectedLower.every((e, idx) => e === denormLower[idx]);
      const normalizedMatch =
        expectedLower.length === normalizedLower.length &&
        expectedLower.every((e, idx) => e === normalizedLower[idx]);

      if (!interestsMatch || !normalizedMatch) {
        report.interestDrift++;
        if (report.samples.length < 10) {
          report.samples.push({
            profileId: profile.id,
            driftType: 'interest_mismatch',
            details: `expected [${expectedLower.join(',')}], denorm [${denormLower.join(',')}], normalized [${normalizedLower.join(',')}]`,
          });
        }
      }

      const hasCasingDrift = denormInterests.some(
        (d, idx) => d !== d.toLowerCase() && expectedInterests[idx] !== d,
      );
      if (hasCasingDrift) {
        report.casingDrift++;
        if (report.samples.length < 10) {
          report.samples.push({
            profileId: profile.id,
            driftType: 'casing_mismatch',
            details: `denorm [${denormInterests.join(',')}] vs normalized [${normalizedInterests.join(',')}]`,
          });
        }
      }
    }

    console.log('\n=== DRIFT VALIDATION REPORT ===\n');
    console.log(`Total ANALYZED profiles: ${report.totalAnalyzed}`);
    console.log(`Profiles checked: ${report.profilesChecked}`);
    console.log(`\nDrift Counts:`);
    console.log(`  Signal mismatch: ${report.signalDrift} (${((report.signalDrift / report.profilesChecked) * 100).toFixed(1)}%)`);
    console.log(`  Interest mismatch: ${report.interestDrift} (${((report.interestDrift / report.profilesChecked) * 100).toFixed(1)}%)`);
    console.log(`  Casing drift: ${report.casingDrift} (${((report.casingDrift / report.profilesChecked) * 100).toFixed(1)}%)`);
    console.log(`  Missing denorm: ${report.missingDenorm} (${((report.missingDenorm / report.profilesChecked) * 100).toFixed(1)}%)`);
    console.log(`  Missing normalized: ${report.missingNormalized} (${((report.missingNormalized / report.profilesChecked) * 100).toFixed(1)}%)`);

    if (report.samples.length > 0) {
      console.log(`\nSample Mismatches (first ${Math.min(10, report.samples.length)}):`);
      report.samples.forEach((s) => {
        console.log(`  [${s.driftType}] ${s.profileId}: ${s.details}`);
      });
    }

    console.log('\n=== END REPORT ===\n');

    const totalDrift = report.signalDrift + report.interestDrift;
    if (totalDrift === 0) {
      console.log('✓ No drift detected. All columns in sync.');
      process.exit(0);
    } else {
      console.log(`⚠ Drift detected in ${totalDrift} profiles.`);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Error during drift validation:', e);
  process.exit(1);
});
