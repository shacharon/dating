/**
 * Re-analyze only selected profile IDs using current extraction pipeline.
 * Run: npx ts-node --transpile-only scripts/reanalyze-ids.ts 14 16
 */

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import type { EvaluateBatchResult } from '../src/evaluate/evaluate.service';
import { EvaluateService } from '../src/evaluate/evaluate.service';
import { ProfilesJsonService } from '../src/profiles/profiles-json.service';

const ROOT = process.cwd();
if (!process.env.PROFILES_DATA_DIR) {
  process.env.PROFILES_DATA_DIR = join(ROOT, 'data', 'profiles');
}
const PROMPT_VERSION = 'v1';
const POLICY_VERSION = 'product-score-v1';

function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

async function main(): Promise<void> {
  const ids = process.argv.slice(2).map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    console.error('Usage: npx ts-node --transpile-only scripts/reanalyze-ids.ts <id> [id...]');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const evaluateService = app.get(EvaluateService);
  const profilesJson = app.get(ProfilesJsonService);

  let processed = 0;
  let failed = 0;

  for (const id of ids) {
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
        profileId: profile.id,
      });

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
      processed++;
      console.log(`Re-analyzed: ${id}`);
    } catch (err) {
      console.error(`Analyze failed for ${id}:`, err);
      failed++;
    }
  }

  await app.close();
  console.log(`Done. Processed=${processed} Failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
