/**
 * Debug extraction regression: compare before/after extraction for target profiles.
 * Identifies root causes of coverage drop and EMPTY_MODEL_TEXT issues.
 *
 * Run: npm run debug:extraction-regression
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EvaluateService } from '../src/evaluate/evaluate.service';
import { ProfilesJsonService } from '../src/profiles/profiles-json.service';
import type { ExtractedSignals } from '../src/extraction/extracted-signals.interface';

const ROOT = process.cwd();

if (!process.env.PROFILES_DATA_DIR) {
  process.env.PROFILES_DATA_DIR = join(ROOT, 'data', 'profiles');
}

/** Target profiles for debug (mix of good/bad/manual pairs). */
const TARGET_PROFILE_IDS = [
  '37',        // Tom (manual pair)
  'merged_14', // Natalie (manual pair)
  '17',        // Zen Yoga Teacher (had EMPTY_MODEL_TEXT in relationship)
  '7',         // Radical Activist (had EMPTY_MODEL_TEXT in partner)
  '3',         // Traditional Nerd
];

interface DomainDebugInfo {
  domain: 'self' | 'partner' | 'relationship';
  inputTextLength: number;
  inputTextPreview: string;
  nonNullCount: number;
  confidence: number;
  emptyModelText: boolean;
  retryRan: boolean;
  evidenceCount: number;
  inferenceRulesFired: string[];
  signals: Record<string, number | null>;
  evidence: Array<{ signal: string; quote: string; note?: string }>;
  coverageNotes?: string[];
}

interface ProfileDebugInfo {
  profileId: string;
  profileName: string;
  self: DomainDebugInfo;
  partner: DomainDebugInfo;
  relationship: DomainDebugInfo;
  avgCoverage: number;
}

function countNonNull(signals: Record<string, number | null>): number {
  return Object.values(signals).filter((v) => v != null).length;
}

function getInferenceRulesFired(coverageNotes?: string[]): string[] {
  if (!coverageNotes) return [];
  return coverageNotes
    .filter((n) => n.includes('=>'))
    .map((n) => n.split('=>')[0]?.trim() ?? '');
}

function buildDomainDebugInfo(
  domain: 'self' | 'partner' | 'relationship',
  extracted: ExtractedSignals,
  inputText: string,
): DomainDebugInfo {
  const nonNullCount = countNonNull(extracted.signals);
  const evidenceCount = (extracted.evidence ?? []).length;
  const emptyModelText = extracted.notes?.includes('EXTRACTION_EMPTY') ?? false;
  const retryRan = extracted.notes?.includes('EXTRACTION_EMPTY') ?? false;
  const inferenceRulesFired = getInferenceRulesFired(extracted.coverageNotes);

  return {
    domain,
    inputTextLength: inputText.trim().length,
    inputTextPreview: inputText.trim().slice(0, 80),
    nonNullCount,
    confidence: extracted.confidence,
    emptyModelText,
    retryRan,
    evidenceCount,
    inferenceRulesFired,
    signals: extracted.signals,
    evidence: extracted.evidence ?? [],
    coverageNotes: extracted.coverageNotes,
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const evaluateService = app.get(EvaluateService);
  const profilesJson = app.get(ProfilesJsonService);

  const results: ProfileDebugInfo[] = [];

  for (const id of TARGET_PROFILE_IDS) {
    const profile = await profilesJson.getById(id);
    if (!profile) {
      console.warn(`Profile not found: ${id}`);
      continue;
    }

    console.log(`\nAnalyzing ${id} (${profile.name})...`);

    const { result: evaluation } = await evaluateService.evaluateBatch({
      aboutMe: profile.texts.aboutMe ?? '',
      aboutRelationship: profile.texts.aboutRelationship ?? '',
      aboutPartner: profile.texts.aboutPartner ?? '',
    });

    const selfInfo = buildDomainDebugInfo('self', evaluation.self, profile.texts.aboutMe ?? '');
    const partnerInfo = buildDomainDebugInfo('partner', evaluation.partner, profile.texts.aboutPartner ?? '');
    const relationshipInfo = buildDomainDebugInfo('relationship', evaluation.relationship, profile.texts.aboutRelationship ?? '');

    const avgCoverage =
      (selfInfo.nonNullCount + partnerInfo.nonNullCount + relationshipInfo.nonNullCount) / (3 * 14);

    results.push({
      profileId: id,
      profileName: profile.name,
      self: selfInfo,
      partner: partnerInfo,
      relationship: relationshipInfo,
      avgCoverage: avgCoverage * 100,
    });

    console.log(`  Self: ${selfInfo.nonNullCount}/14 signals, confidence ${selfInfo.confidence.toFixed(2)}, emptyModel: ${selfInfo.emptyModelText}`);
    console.log(`  Partner: ${partnerInfo.nonNullCount}/14 signals, confidence ${partnerInfo.confidence.toFixed(2)}, emptyModel: ${partnerInfo.emptyModelText}`);
    console.log(`  Relationship: ${relationshipInfo.nonNullCount}/14 signals, confidence ${relationshipInfo.confidence.toFixed(2)}, emptyModel: ${relationshipInfo.emptyModelText}`);
    console.log(`  Avg coverage: ${avgCoverage.toFixed(1)}%`);
  }

  await app.close();

  console.log('\n=== REGRESSION DEBUG SUMMARY ===\n');
  console.log('Target profiles analyzed:', results.length);
  console.log('');

  for (const r of results) {
    console.log(`${r.profileId} (${r.profileName}): avg coverage ${r.avgCoverage.toFixed(1)}%`);
    console.log(`  Self: ${r.self.nonNullCount}/14, empty: ${r.self.emptyModelText}, retry: ${r.self.retryRan}`);
    console.log(`  Partner: ${r.partner.nonNullCount}/14, empty: ${r.partner.emptyModelText}, retry: ${r.partner.retryRan}`);
    console.log(`  Relationship: ${r.relationship.nonNullCount}/14, empty: ${r.relationship.emptyModelText}, retry: ${r.relationship.retryRan}`);
    console.log('');
  }

  const emptyModelCount = results.reduce(
    (sum, r) =>
      sum +
      (r.self.emptyModelText ? 1 : 0) +
      (r.partner.emptyModelText ? 1 : 0) +
      (r.relationship.emptyModelText ? 1 : 0),
    0,
  );
  console.log(`Total EMPTY_MODEL_TEXT occurrences: ${emptyModelCount} / ${results.length * 3} domains`);

  console.log('\n=== DETAILED INSPECTION ===\n');
  for (const r of results) {
    console.log(`\n--- ${r.profileId} (${r.profileName}) ---\n`);
    for (const d of [r.self, r.partner, r.relationship]) {
      console.log(`${d.domain.toUpperCase()}:`);
      console.log(`  Input length: ${d.inputTextLength} chars`);
      console.log(`  Input preview: "${d.inputTextPreview}"`);
      console.log(`  NonNull signals: ${d.nonNullCount}/14`);
      console.log(`  Confidence: ${d.confidence.toFixed(2)}`);
      console.log(`  Empty model text: ${d.emptyModelText}`);
      console.log(`  Retry ran: ${d.retryRan}`);
      console.log(`  Evidence count: ${d.evidenceCount}`);
      console.log(`  Inference rules fired: ${d.inferenceRulesFired.length > 0 ? d.inferenceRulesFired.join(', ') : 'none'}`);
      if (d.evidence.length > 0) {
        console.log(`  Evidence samples (first 3):`);
        for (const ev of d.evidence.slice(0, 3)) {
          console.log(`    - ${ev.signal}: "${ev.quote}" ${ev.note ? `(${ev.note})` : ''}`);
        }
      }
      console.log('');
    }
  }

  console.log('\n=== ROOT CAUSE ANALYSIS ===\n');
  console.log('Likely causes ranked by confidence:');
  console.log('');
  console.log('HIGH confidence:');
  console.log('  1. Evidence quote requirement too strict: model returns empty when it cannot find verbatim 5-15 word snippets.');
  console.log('  2. "Distinct from" wording causing confusion: model may be over-cautious about assigning signals.');
  console.log('');
  console.log('MEDIUM confidence:');
  console.log('  3. Anti-double-count rule too strict: "A single phrase should support at most 1-2 signals" may block valid multi-signal inference.');
  console.log('  4. Retry prompt not effective: retry still returns empty or low coverage.');
  console.log('');
  console.log('LOW confidence:');
  console.log('  5. Model behavior change (unlikely with same model/temperature).');
  console.log('  6. Inference rules too narrow (but they only fill nulls, so cannot cause regression).');
  console.log('');
  console.log('See docs/extraction-regression-debug.md for full analysis.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
