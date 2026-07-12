/**
 * Re-analyze a cohort of profiles with the current extraction pipeline (e.g. after prompt/inference changes).
 * Reads cohort IDs from data/pilot-cohort.json, runs evaluateBatch for each, saves updated profile JSONs.
 * Use before recompute-matches to refresh match scores for the cohort.
 *
 * Run: npm run reanalyze-cohort
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import type { EvaluateBatchResult } from '../src/evaluate/evaluate.service';
import { EvaluateService } from '../src/evaluate/evaluate.service';
import { LegacyBackendAdapter } from '../src/legacy/legacy-backend.adapter';

const ROOT = process.cwd();
const COHORT_PATH = join(ROOT, 'data', 'pilot-cohort.json');
if (!process.env.PROFILES_DATA_DIR) {
  process.env.PROFILES_DATA_DIR = join(ROOT, 'data', 'profiles');
}
const PROMPT_VERSION = 'v1';
const POLICY_VERSION = 'product-score-v1';

function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

function coveragePct(signals: Record<string, number | null>, totalSlots: number): number {
  const nonNull = Object.values(signals).filter((v) => v != null).length;
  return totalSlots > 0 ? (nonNull / totalSlots) * 100 : 0;
}

const SIGNAL_SLOTS = 15;

async function main(): Promise<void> {
  let cohortIds: string[];
  try {
    const raw = await readFile(COHORT_PATH, 'utf8');
    cohortIds = JSON.parse(raw) as string[];
    if (!Array.isArray(cohortIds) || cohortIds.some((id) => typeof id !== 'string')) {
      throw new Error('pilot-cohort.json must be a JSON array of profile ID strings');
    }
  } catch (err) {
    console.error('Failed to read cohort:', COHORT_PATH, err);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const evaluateService = app.get(EvaluateService);
  const profilesJson = app.get(LegacyBackendAdapter).profilesJson;

  let beforeSum = 0;
  let beforeCount = 0;
  for (const id of cohortIds) {
    const profile = await profilesJson.getById(id);
    if (!profile?.evaluation?.self?.signals) continue;
    beforeSum += coveragePct(profile.evaluation.self.signals, SIGNAL_SLOTS);
    beforeCount++;
  }
  const coverageBefore = beforeCount > 0 ? beforeSum / beforeCount : 0;

  console.log(`Cohort: ${cohortIds.length} IDs. Coverage before (avg self signals): ${coverageBefore.toFixed(1)}%`);

  let afterSum = 0;
  let processed = 0;
  let failed = 0;

  for (const id of cohortIds) {
    const profile = await profilesJson.getById(id);
    if (!profile) {
      console.warn(`Profile not found: ${id}`);
      failed++;
      continue;
    }

    const textConcat =
      (profile.texts.aboutMe ?? '') +
      '|' +
      (profile.texts.aboutPartner ?? '') +
      '|' +
      (profile.texts.aboutRelationship ?? '');
    const textHash = hashText(textConcat);

    try {
      const { result: evaluation } = await evaluateService.evaluateBatch({
        aboutMe: profile.texts.aboutMe ?? '',
        aboutRelationship: profile.texts.aboutRelationship ?? '',
        aboutPartner: profile.texts.aboutPartner ?? '',
      });

      afterSum += coveragePct(evaluation.self.signals, SIGNAL_SLOTS);
      processed++;

      const updatedAt = new Date().toISOString();
      const policyVersionSaved = evaluation.productScores?.policyVersion ?? POLICY_VERSION;

      await profilesJson.save(profile.id, {
        id: profile.id,
        name: profile.name,
        texts: profile.texts,
        evaluation: evaluation as EvaluateBatchResult,
        evaluationStatus: 'DONE',
        evaluatedAt: updatedAt,
        promptVersion: PROMPT_VERSION,
        policyVersion: policyVersionSaved,
        textHash,
        signals: evaluation.self.signals,
      });
    } catch (err) {
      console.error(`Analyze failed for ${id}:`, err);
      failed++;
    }
  }

  const coverageAfter = processed > 0 ? afterSum / processed : 0;

  await app.close();

  console.log('');
  console.log('--- Reanalyze cohort report ---');
  console.log('Processed:', processed);
  console.log('Failed:', failed);
  console.log('Coverage before (avg %):', coverageBefore.toFixed(1));
  console.log('Coverage after (avg %):', coverageAfter.toFixed(1));
  console.log('');
  console.log('Next: npm run recompute-matches && npm run validate:golden-pairs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
