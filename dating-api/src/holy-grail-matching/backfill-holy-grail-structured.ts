import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import {
  AcceptedPartnerAlcohol,
  MinimumPartnerEducation,
  PartnerHasChildrenAcceptance,
  ReligionSelf,
} from '../canonical/matching-canonical.types';
import { HolyGrailStructuredWriteService } from './holy-grail-structured-write.service';
import { HolyGrailRetrievalService } from './retrieval/holy-grail-retrieval.service';
import { PrismaHolyGrailProfileSourceRepository } from './retrieval/prisma-holy-grail-profile-source.repository';
import { mapProfileSourceToMatchingCanonical } from './profile-to-canonical.mapper';
import { extractSimilarityPreferenceFromFreeText } from './similarity-preference-text.extract';
import { evaluateHolyGrailDirectional } from './eligibility.evaluator';
import {
  HOLY_GRAIL_DIMENSION_KEYS,
  type HolyGrailDimensionKey,
} from './holy-grail-dimensions';

type JsonRecord = Record<string, unknown>;
type DimStats = Record<HolyGrailDimensionKey, number>;

const TARGET_UPDATES = Number(process.env.HG_BACKFILL_TARGET ?? '30');
const SCAN_LIMIT = Number(process.env.HG_BACKFILL_SCAN_LIMIT ?? '500');
const VALIDATION_SEARCHERS = Number(process.env.HG_VALIDATE_SEARCHERS ?? '5');
const VALIDATION_CANDIDATE_LIMIT = Number(
  process.env.HG_VALIDATE_CANDIDATES ?? '300',
);

const TARGET_PREF_KEYS = new Set([
  'partnerAgeMin',
  'partnerAgeMax',
  'minimumPartnerEducation',
  'acceptedPartnerReligions',
  'acceptedPartnerAlcohol',
  'partnerHasChildren',
  'similarityPreference',
]);

const TARGET_DIMENSIONS: HolyGrailDimensionKey[] = [
  'AGE',
  'EDUCATION',
  'RELIGION',
  'ALCOHOL',
  'PARTNER_HAS_CHILDREN',
];

function asObject(v: unknown): JsonRecord {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as JsonRecord;
  }
  return {};
}

function addIfMissing(
  target: JsonRecord,
  existing: JsonRecord,
  key: string,
  value: unknown,
): void {
  if (value === undefined) return;
  if (existing[key] !== undefined) return;
  target[key] = value;
}

function clampAdultAge(n: number): number {
  return Math.max(18, Math.min(120, n));
}

function inferSelfAge(aboutMe: string): number | undefined {
  const explicit = aboutMe.match(
    /\b(i am|i'?m)\s+(\d{2})\s*(?:years old|yo|y\/o)?\b/i,
  );
  if (explicit) {
    const age = Number(explicit[2]);
    if (Number.isInteger(age) && age >= 18 && age <= 120) return age;
  }
  const plain = aboutMe.match(/\b(\d{2})\s*(?:years old|yo|y\/o)\b/i);
  if (plain) {
    const age = Number(plain[1]);
    if (Number.isInteger(age) && age >= 18 && age <= 120) return age;
  }
  return undefined;
}

function inferPartnerAgeRange(
  partnerText: string,
  selfAge: number | undefined,
): { min?: number; max?: number } {
  const out: { min?: number; max?: number } = {};
  const between = partnerText.match(
    /\b(?:between|ages?)\s+(\d{2})\s*(?:-|to|and)\s*(\d{2})\b/i,
  );
  if (between) {
    const a = Number(between[1]);
    const b = Number(between[2]);
    if (
      Number.isInteger(a) &&
      Number.isInteger(b) &&
      a >= 18 &&
      b <= 120 &&
      a <= b
    ) {
      out.min = a;
      out.max = b;
      return out;
    }
  }

  const dashRange = partnerText.match(/\b(\d{2})\s*-\s*(\d{2})\b/);
  if (dashRange) {
    const a = Number(dashRange[1]);
    const b = Number(dashRange[2]);
    if (
      Number.isInteger(a) &&
      Number.isInteger(b) &&
      a >= 18 &&
      b <= 120 &&
      a <= b
    ) {
      return { min: a, max: b };
    }
  }

  const decade = partnerText.match(/\bin (?:their|your)?\s*(\d{2})s\b/i);
  if (decade) {
    const d = Number(decade[1]);
    if (Number.isInteger(d) && d >= 20 && d <= 90) {
      return { min: d, max: d + 9 };
    }
  }

  if (selfAge !== undefined) {
    if (/\b(around my age|close to my age|similar age)\b/i.test(partnerText)) {
      return {
        min: clampAdultAge(selfAge - 3),
        max: clampAdultAge(selfAge + 3),
      };
    }
    if (/\b(a bit|slightly)?\s*older than me\b/i.test(partnerText)) {
      return {
        min: clampAdultAge(selfAge + 1),
        max: clampAdultAge(selfAge + 5),
      };
    }
    if (/\b(a bit|slightly)?\s*younger than me\b/i.test(partnerText)) {
      return {
        min: clampAdultAge(selfAge - 5),
        max: clampAdultAge(selfAge - 1),
      };
    }
  }

  return out;
}

function inferPartnerHasChildren(
  text: string,
): PartnerHasChildrenAcceptance | undefined {
  if (
    /\b(no kids|must not have kids|without kids|childfree only|prefer childfree|prefer no kids|no children)\b/i.test(
      text,
    )
  ) {
    return PartnerHasChildrenAcceptance.DOES_NOT_ACCEPT;
  }
  if (
    /\b(kids are okay|kids ok|children are okay|single parent is okay|open to someone with kids|okay with children|okay with kids|has kids is fine)\b/i.test(
      text,
    )
  ) {
    return PartnerHasChildrenAcceptance.ACCEPT;
  }
  return undefined;
}

function inferAcceptedPartnerAlcohol(
  text: string,
): AcceptedPartnerAlcohol | undefined {
  if (
    /\b(non[- ]drinker only|no alcohol|must not drink|doesn'?t drink only)\b/i.test(
      text,
    )
  ) {
    return AcceptedPartnerAlcohol.NONE_ONLY;
  }
  if (
    /\b(no heavy drinkers|social drinking is okay|drinks socially is fine|moderate drinkers? ok|occasional drinking is fine|social drinker|drinks occasionally)\b/i.test(
      text,
    )
  ) {
    return AcceptedPartnerAlcohol.MODERATE_OK;
  }
  if (
    /\b(alcohol is fine|drinking is fine|okay with drinking|no alcohol preference|party drinker|party drinking)\b/i.test(
      text,
    )
  ) {
    return AcceptedPartnerAlcohol.ANY;
  }
  return undefined;
}

function inferMinimumPartnerEducation(
  text: string,
): MinimumPartnerEducation | undefined {
  if (/\b(phd|doctorate|master'?s or higher|graduate degree)\b/i.test(text)) {
    return MinimumPartnerEducation.GRADUATE;
  }
  if (
    /\b(at least a bachelor'?s|bachelor'?s or higher|has a degree|college degree|academic|university degree|higher education)\b/i.test(
      text,
    )
  ) {
    return MinimumPartnerEducation.BACHELORS;
  }
  if (
    /\b(at least some college|college educated|educated|college|university)\b/i.test(
      text,
    )
  ) {
    return MinimumPartnerEducation.SOME_COLLEGE;
  }
  if (/\b(high school minimum|at least high school)\b/i.test(text)) {
    return MinimumPartnerEducation.HIGH_SCHOOL;
  }
  return undefined;
}

function inferAcceptedPartnerReligions(
  text: string,
): ReligionSelf[] | undefined {
  if (/\b(not religious|secular)\b/i.test(text)) return [ReligionSelf.NONE];
  if (/\b(keeps kosher|kosher)\b/i.test(text)) return [ReligionSelf.JEWISH];

  const out: ReligionSelf[] = [];
  if (/\b(jewish only|prefer jewish|jewish partner)\b/i.test(text))
    out.push(ReligionSelf.JEWISH);
  if (/\b(christian only|prefer christian|christian partner)\b/i.test(text))
    out.push(ReligionSelf.CHRISTIAN);
  if (/\b(muslim only|prefer muslim|muslim partner)\b/i.test(text))
    out.push(ReligionSelf.MUSLIM);
  if (/\b(hindu only|prefer hindu|hindu partner)\b/i.test(text))
    out.push(ReligionSelf.HINDU);
  if (/\b(buddhist only|prefer buddhist|buddhist partner)\b/i.test(text))
    out.push(ReligionSelf.BUDDHIST);
  if (/\b(religious|faith|traditional)\b/i.test(text)) {
    // Explicitly religious language without denomination is too ambiguous.
    return undefined;
  }
  if (out.length === 0) return undefined;
  return [...new Set(out)];
}

function buildInferredPreferencePatch(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): JsonRecord {
  const partnerContext = `${aboutPartner}\n${aboutRelationship}`;
  const selfAge = inferSelfAge(aboutMe);
  const age = inferPartnerAgeRange(partnerContext, selfAge);
  const similarityPreference = extractSimilarityPreferenceFromFreeText({
    aboutMe,
    aboutPartner,
    aboutRelationship,
  }).value;
  return {
    partnerAgeMin: age.min,
    partnerAgeMax: age.max,
    minimumPartnerEducation: inferMinimumPartnerEducation(partnerContext),
    acceptedPartnerReligions: inferAcceptedPartnerReligions(partnerContext),
    acceptedPartnerAlcohol: inferAcceptedPartnerAlcohol(partnerContext),
    partnerHasChildren: inferPartnerHasChildren(partnerContext),
    similarityPreference,
  };
}

function emptyDimStats(): DimStats {
  return HOLY_GRAIL_DIMENSION_KEYS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as DimStats);
}

function topEntries(
  map: Record<string, number>,
  n: number,
): Array<{ key: string; count: number }> {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

interface ValidationSummary {
  perSearcher: Array<{
    searcherId: string;
    retrieved: number;
    passedHardFilter: number;
    canonicalMapFailed: number;
  }>;
  failReasonCountsByDimension: Record<string, number>;
  skippedByDimension: DimStats;
  totalByDimension: DimStats;
}

async function runValidation(args: {
  searchers: string[];
  retrieval: HolyGrailRetrievalService;
  sources: PrismaHolyGrailProfileSourceRepository;
}): Promise<ValidationSummary> {
  const perSearcher: ValidationSummary['perSearcher'] = [];
  const failReasonCountsByDimension: Record<string, number> = {};
  const skippedByDimension = emptyDimStats();
  const totalByDimension = emptyDimStats();

  for (const searcherId of args.searchers) {
    const retrievalResult = await args.retrieval.retrieveRankedCandidates({
      searcherProfileId: searcherId,
      limit: VALIDATION_CANDIDATE_LIMIT,
    });
    perSearcher.push({
      searcherId,
      retrieved: retrievalResult.debug.retrieved,
      passedHardFilter: retrievalResult.debug.passedHardFilter,
      canonicalMapFailed: retrievalResult.debug.canonicalMapFailed,
    });

    const searcherInput =
      await args.sources.getMappingInputByProfileId(searcherId);
    if (!searcherInput) continue;

    let searcherCanonical;
    try {
      searcherCanonical = mapProfileSourceToMatchingCanonical(searcherInput);
    } catch {
      continue;
    }

    const candidateInputs = await args.sources.listCandidateMappingInputs({
      excludeProfileId: searcherId,
      limit: VALIDATION_CANDIDATE_LIMIT,
    });

    for (const candidateInput of candidateInputs) {
      let candidateCanonical;
      try {
        candidateCanonical =
          mapProfileSourceToMatchingCanonical(candidateInput);
      } catch {
        continue;
      }

      const stc = evaluateHolyGrailDirectional({
        searcher: searcherCanonical,
        counterparty: candidateCanonical,
      });
      const cts = evaluateHolyGrailDirectional({
        searcher: candidateCanonical,
        counterparty: searcherCanonical,
      });

      for (const dim of HOLY_GRAIL_DIMENSION_KEYS) {
        const a = stc.dimensions[dim];
        const b = cts.dimensions[dim];
        totalByDimension[dim] += 2;
        if (a.status === 'SKIPPED') skippedByDimension[dim] += 1;
        if (b.status === 'SKIPPED') skippedByDimension[dim] += 1;
        if (a.status === 'FAIL') {
          const key = `${dim}:${a.reasonCode}`;
          failReasonCountsByDimension[key] =
            (failReasonCountsByDimension[key] ?? 0) + 1;
        }
        if (b.status === 'FAIL') {
          const key = `${dim}:${b.reasonCode}`;
          failReasonCountsByDimension[key] =
            (failReasonCountsByDimension[key] ?? 0) + 1;
        }
      }
    }
  }

  return {
    perSearcher,
    failReasonCountsByDimension,
    skippedByDimension,
    totalByDimension,
  };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const writer = app.get(HolyGrailStructuredWriteService);
  const retrieval = app.get(HolyGrailRetrievalService);
  const sources = app.get(PrismaHolyGrailProfileSourceRepository);

  // Slice 8: MatchmakingProfile reads disabled in-repo; backfill scan is a no-op until Migration 4.
  const rows: {
    id: string;
    name: string;
    aboutMe: string;
    aboutPartner: string | null;
    aboutRelationship: string | null;
    holyGrailStructuredPreferences: unknown;
  }[] = [];

  const baseSearchers = rows
    .slice(0, Math.max(1, VALIDATION_SEARCHERS))
    .map((r) => r.id);
  const before = await runValidation({
    searchers: baseSearchers,
    retrieval,
    sources,
  });

  const touchedProfiles: string[] = [];
  const prefCoverageAdds: Record<string, number> = {};

  for (const row of rows) {
    if (touchedProfiles.length >= TARGET_UPDATES) break;

    const existingPrefs = asObject(row.holyGrailStructuredPreferences);
    const inferredPrefs = buildInferredPreferencePatch(
      row.aboutMe ?? '',
      row.aboutPartner ?? '',
      row.aboutRelationship ?? '',
    );

    const prefPatch: JsonRecord = {};

    for (const key of TARGET_PREF_KEYS) {
      addIfMissing(prefPatch, existingPrefs, key, inferredPrefs[key]);
    }

    if (Object.keys(prefPatch).length === 0) {
      continue;
    }

    await writer.mergeStructuredLayers(row.id, {
      structuredPreferencesPatch: prefPatch,
    });

    touchedProfiles.push(row.id);
    for (const k of Object.keys(prefPatch))
      prefCoverageAdds[k] = (prefCoverageAdds[k] ?? 0) + 1;
  }

  const after = await runValidation({
    searchers: baseSearchers,
    retrieval,
    sources,
  });

  const skippedReductionByTargetDimension: Record<string, string> = {};
  let reducedBy30Count = 0;
  for (const dim of TARGET_DIMENSIONS) {
    const beforeTotal = before.totalByDimension[dim];
    const afterTotal = after.totalByDimension[dim];
    const beforePct =
      beforeTotal === 0 ? 0 : before.skippedByDimension[dim] / beforeTotal;
    const afterPct =
      afterTotal === 0 ? 0 : after.skippedByDimension[dim] / afterTotal;
    const relReduction =
      beforePct === 0 ? 0 : (beforePct - afterPct) / beforePct;
    if (relReduction >= 0.3) reducedBy30Count += 1;
    skippedReductionByTargetDimension[dim] =
      `${(beforePct * 100).toFixed(1)}% -> ${(afterPct * 100).toFixed(1)}% (${(
        relReduction * 100
      ).toFixed(1)}% relative reduction)`;
  }

  console.log('=== HOLY GRAIL BACKFILL SUMMARY ===');
  console.log(`profiles_scanned=${rows.length}`);
  console.log(`profiles_updated=${touchedProfiles.length}`);
  console.log(`target_updates=${TARGET_UPDATES}`);
  console.log('prefs_added_by_key=', JSON.stringify(prefCoverageAdds));
  console.log('updated_profile_ids=', JSON.stringify(touchedProfiles));

  console.log('\n=== HOLY GRAIL VALIDATION REPORT (AFTER) ===');
  for (const r of after.perSearcher) {
    console.log(
      `searcher=${r.searcherId} retrieved=${r.retrieved} passedHardFilter=${r.passedHardFilter} canonicalMapFailed=${r.canonicalMapFailed}`,
    );
  }

  console.log('\nTop FAIL reasons by dimension:');
  for (const row of topEntries(after.failReasonCountsByDimension, 20)) {
    console.log(`  ${row.key} => ${row.count}`);
  }

  console.log('\nSKIPPED frequency by dimension:');
  for (const dim of HOLY_GRAIL_DIMENSION_KEYS) {
    const skipped = after.skippedByDimension[dim];
    const total = after.totalByDimension[dim];
    const pct = total > 0 ? ((100 * skipped) / total).toFixed(1) : '0.0';
    console.log(`  ${dim}: skipped=${skipped}/${total} (${pct}%)`);
  }

  console.log('\nTargeted dimension SKIPPED reduction (before -> after):');
  for (const dim of TARGET_DIMENSIONS) {
    console.log(`  ${dim}: ${skippedReductionByTargetDimension[dim]}`);
  }
  console.log(
    `targeted_dimensions_with_at_least_30pct_relative_skipped_reduction=${reducedBy30Count}/${TARGET_DIMENSIONS.length}`,
  );

  const allSearchersHavePasses = after.perSearcher.every(
    (x) => x.passedHardFilter > 0,
  );
  console.log(`all_searchers_passedHardFilter_gt_0=${allSearchersHavePasses}`);

  const weakCoverageDims = HOLY_GRAIL_DIMENSION_KEYS.filter((dim) => {
    const total = after.totalByDimension[dim];
    if (total === 0) return true;
    return after.skippedByDimension[dim] / total >= 0.7;
  });
  console.log('\nweak_coverage_dimensions=', JSON.stringify(weakCoverageDims));

  await app.close();
}

main().catch((error) => {
  console.error('Backfill/validation failed:', error);
  process.exit(1);
});
