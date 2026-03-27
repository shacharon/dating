/**
 * Load 4 external (Hebrew) self-text profiles, run extraction + evaluate pipeline,
 * then compare each against all on-disk analyzed profiles. Writes data/external-matches.json.
 *
 * Run (from dating-api root, OPENAI_API_KEY set):
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/external-match.ts
 *
 * Env:
 *   PROFILES_DATA_DIR — default: <cwd>/data/profiles
 */

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import type { EvaluateBatchResult } from '../src/evaluate/evaluate.service';
import { EvaluateService } from '../src/evaluate/evaluate.service';
import { countNonNullSignals } from '../src/extraction/extracted-signals.interface';
import { compareWithStatus } from '../src/matches/match-engine';
import type { CompareResultDto } from '../src/matches/match-engine';
import type { ProfileJsonPayload } from '../src/profiles/profiles-json.service';

const ROOT = process.cwd();
if (!process.env.PROFILES_DATA_DIR?.trim()) {
  process.env.PROFILES_DATA_DIR = join(ROOT, 'data', 'profiles');
}

const PROFILES_DIR = process.env.PROFILES_DATA_DIR.trim();
const OUTPUT_PATH = join(ROOT, 'data', 'external-matches.json');
const PROMPT_VERSION = 'v1';
const POLICY_VERSION = 'product-score-v1';

const TOP_N = 5;

/** Four real-world Hebrew “about me” style texts from reference profiles. */
const EXTERNAL_PROFILES: ReadonlyArray<{ id: string; name: string; aboutMe: string }> = [
  {
    id: 'ext-he-hani',
    name: 'חני',
    aboutMe: `חולון, 40.
מחפשת משהו אמיתי ולא להעביר את הזמן.`,
  },
  {
    id: 'ext-he-gili',
    name: 'גילי',
    aboutMe: `מיתר, 50.
זה לא משנה מה את עושה, כל עוד את עושה אותו טוב.`,
  },
  {
    id: 'ext-he-zehava',
    name: 'זהבה',
    aboutMe: `רמלה, 51.
אישה עירונית בנשמה, שאוהבת לטעום מהחיים הטובים - ממסעדות ועד אירועי תרבות. עם תואר שני והרבה רצון לקשר יציב. לא מחובבי החיות, לא מעשנת ומחפשת פרטנר שלא מעשן לבנות איתו עתיד משותף. אולי זה אתה?`,
  },
  {
    id: 'ext-he-reut',
    name: 'רעות',
    aboutMe: `הרצליה, 39.
רעות, גרה בהרצליה.... מסורתית ✡️
מעריכה כנות, יושר וצניעות.
מכבדת כל אדם באשר הוא 🌷.
(גרושה ללא ילדים)

חוש הומור זה חובה! 😄
חולה על בע״ח 🐈🐕
מלבד ג'וקים, שתהיה חייב לטפל בהם בשבילי 🩴
בהצלחה לכולם 🌸`,
  },
];

function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

function hasNumericSelfSignals(profile: ProfileJsonPayload): boolean {
  const signals = profile.evaluation?.self?.signals;
  if (!signals || typeof signals !== 'object') return false;
  return Object.values(signals).some((v) => typeof v === 'number' && Number.isFinite(v));
}

async function loadAllDiskProfiles(): Promise<ProfileJsonPayload[]> {
  let entries: string[];
  try {
    entries = await readdir(PROFILES_DIR);
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') {
      console.error(`Profiles directory not found: ${PROFILES_DIR}`);
      process.exit(1);
    }
    throw err;
  }

  const out: ProfileJsonPayload[] = [];
  const jsonFiles = entries.filter((f) => f.endsWith('.json') && !f.endsWith('.json.tmp'));

  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(PROFILES_DIR, file), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        'id' in parsed &&
        'name' in parsed &&
        'texts' in parsed &&
        'evaluation' in parsed &&
        'savedAt' in parsed
      ) {
        out.push(parsed as ProfileJsonPayload);
      }
    } catch {
      // skip
    }
  }

  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function isReadyCompareProfile(p: ProfileJsonPayload): boolean {
  return (p.evaluationStatus === 'DONE' || p.evaluationStatus == null) && hasNumericSelfSignals(p);
}

function buildExternalPayload(
  meta: { id: string; name: string; aboutMe: string },
  evaluation: EvaluateBatchResult,
): ProfileJsonPayload {
  const textConcat = `${meta.aboutMe}||`;
  const textHash = hashText(textConcat);
  const evaluatedAt = new Date().toISOString();
  const policyVersionSaved = evaluation.productScores?.policyVersion ?? POLICY_VERSION;

  return {
    id: meta.id,
    name: meta.name,
    texts: {
      aboutMe: meta.aboutMe,
      aboutPartner: '',
      aboutRelationship: '',
    },
    evaluation,
    savedAt: evaluatedAt,
    evaluationStatus: 'DONE',
    evaluatedAt,
    promptVersion: PROMPT_VERSION,
    policyVersion: policyVersionSaved,
    textHash,
    signals: evaluation.self.signals,
  };
}

type MatchRowOut = {
  partnerId: string;
  partnerName: string;
  finalScore: number;
  compatibility: number;
  friction: number;
  coverage: number;
  reasonShort: string;
  positiveChips: string[];
  tensionChip?: string;
};

function rowFromCompare(partner: ProfileJsonPayload, dto: CompareResultDto): MatchRowOut {
  const ex = dto.explainability;
  return {
    partnerId: partner.id,
    partnerName: partner.name,
    finalScore: dto.finalScore,
    compatibility: dto.compatibility,
    friction: dto.friction,
    coverage: dto.coverage,
    reasonShort: ex.reasonShort,
    positiveChips: [...ex.positiveChips],
    ...(ex.tensionChip !== undefined ? { tensionChip: ex.tensionChip } : {}),
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const evaluateService = app.get(EvaluateService);

  const diskProfiles = await loadAllDiskProfiles();
  const candidates = diskProfiles.filter(isReadyCompareProfile);

  console.log(
    `Loaded ${diskProfiles.length} profiles from disk; ${candidates.length} ready for compare (DONE + numeric self signals).`,
  );

  const externalResults: Array<{
    id: string;
    name: string;
    aboutMeChars: number;
    selfNonNullSignals: number;
    error?: string;
    topMatches?: MatchRowOut[];
  }> = [];

  for (const ext of EXTERNAL_PROFILES) {
    try {
      const { result: evaluation } = await evaluateService.evaluateBatch({
        aboutMe: ext.aboutMe,
        aboutRelationship: '',
        aboutPartner: '',
        profileId: ext.id,
      });

      const selfNonNull = countNonNullSignals(evaluation.self.signals);
      if (selfNonNull === 0) {
        externalResults.push({
          id: ext.id,
          name: ext.name,
          aboutMeChars: ext.aboutMe.length,
          selfNonNullSignals: 0,
          error: 'EXTRACTION_SELF_EMPTY',
        });
        console.warn(`Skip ${ext.id}: self signals all null after extraction.`);
        continue;
      }

      const externalProfile = buildExternalPayload(ext, evaluation);

      const scored: MatchRowOut[] = [];
      for (const partner of candidates) {
        if (partner.id === ext.id) continue;

        const outcome = compareWithStatus(externalProfile, partner);
        if ('status' in outcome) continue;

        scored.push(rowFromCompare(partner, outcome));
      }

      scored.sort((x, y) => {
        if (y.finalScore !== x.finalScore) return y.finalScore - x.finalScore;
        return x.partnerId.localeCompare(y.partnerId);
      });

      const topMatches = scored.slice(0, TOP_N);
      externalResults.push({
        id: ext.id,
        name: ext.name,
        aboutMeChars: ext.aboutMe.length,
        selfNonNullSignals: selfNonNull,
        topMatches,
      });
      console.log(`OK ${ext.id}: top score ${topMatches[0]?.finalScore ?? '—'} vs ${topMatches.length} rows`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      externalResults.push({
        id: ext.id,
        name: ext.name,
        aboutMeChars: ext.aboutMe.length,
        selfNonNullSignals: 0,
        error: msg,
      });
      console.error(`FAIL ${ext.id}:`, msg);
    }
  }

  await app.close();

  await mkdir(join(ROOT, 'data'), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    profilesDir: PROFILES_DIR,
    diskProfileCount: diskProfiles.length,
    compareReadyCount: candidates.length,
    topN: TOP_N,
    externalProfiles: externalResults,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
