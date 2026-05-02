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

const EVALUATION_VERSION_FALLBACK = 'v1';

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
  const enrichmentSignals = enrichment?.signals as
    | Record<string, unknown>
    | undefined;
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

function parseMode(argv: string[]): { apply: boolean } {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run');
  if (apply && dryRun) {
    throw new Error('Use either --apply or --dry-run, not both.');
  }
  return { apply };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const { apply } = parseMode(process.argv.slice(2));
  const mode = apply ? 'APPLY' : 'DRY_RUN';
  console.log(`[backfill-normalized] mode=${mode}`);

  try {
    const profiles = await prisma.userProfile.findMany({
      where: { status: UserProfileStatus.ANALYZED },
      select: {
        id: true,
        desiredPartnerGenders: true,
      },
    });

    // Latest evaluation per profile: same rule as `latestEvaluationsForProfileIds` (DESC createdAt, first wins).
    const evaluations = await prisma.userProfileEvaluation.findMany({
      where: { profileId: { in: profiles.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' },
      select: { profileId: true, version: true, evaluationJson: true },
    });

    const latestEvalByProfile = new Map<string, (typeof evaluations)[number]>();
    for (const ev of evaluations) {
      if (!latestEvalByProfile.has(ev.profileId)) latestEvalByProfile.set(ev.profileId, ev);
    }

    let signalUpserts = 0;
    let interestDeletes = 0;
    let interestCreates = 0;
    let preferenceUpserts = 0;

    for (const profile of profiles) {
      const ev = latestEvalByProfile.get(profile.id);
      const evalJson = ev?.evaluationJson;
      const evalVersion = ev?.version ?? EVALUATION_VERSION_FALLBACK;

      const signalMap = extractSignalMap(evalJson);
      const interestTags = pickTopInterests(evalJson).map((x) => x.toLowerCase().trim());

      signalUpserts += Object.keys(signalMap).length;
      interestDeletes += 1;
      interestCreates += interestTags.length;
      preferenceUpserts += 1;

      if (!apply) continue;

      await prisma.$transaction(async (tx) => {
        for (const key of SIGNAL_KEYS) {
          const signalValue = signalMap[key];
          if (signalValue === undefined) continue;
          await tx.userProfileSignal.upsert({
            where: { profileId_signalKey: { profileId: profile.id, signalKey: key } },
            create: { profileId: profile.id, signalKey: key, signalValue, evalVersion },
            update: { signalValue, evalVersion },
          });
        }

        await tx.userProfileInterest.deleteMany({ where: { profileId: profile.id } });
        for (let i = 0; i < interestTags.length; i++) {
          await tx.userProfileInterest.create({
            data: {
              profileId: profile.id,
              tag: interestTags[i],
              rank: i + 1,
              source: 'enrichment',
              evalVersion,
            },
          });
        }

        const desired = Array.isArray(profile.desiredPartnerGenders)
          ? profile.desiredPartnerGenders
              .filter((x): x is string => typeof x === 'string')
              .filter((x) => x !== 'PREFER_NOT_TO_SAY')
          : [];

        // Phase F: scalar/array partner prefs are not on UserProfile — only sync genders from product JSON.
        await tx.userProfilePreference.upsert({
          where: { profileId: profile.id },
          create: {
            profileId: profile.id,
            acceptedPartnerGenders: desired,
          },
          update: {
            acceptedPartnerGenders: desired,
          },
        });
      });
    }

    console.log(
      `[backfill-normalized] profiles=${profiles.length} latestEvaluations=${latestEvalByProfile.size}`,
    );
    console.log(
      `[backfill-normalized] signalUpserts=${signalUpserts} interestDeletes=${interestDeletes} interestCreates=${interestCreates} preferenceUpserts=${preferenceUpserts}`,
    );
    console.log(
      `[backfill-normalized] completed mode=${mode} (use --apply to write changes)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[backfill-normalized] failed:', err);
  process.exit(1);
});

