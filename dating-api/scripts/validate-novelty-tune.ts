/**
 * Validate noveltyVsRoutine prompt tuning on a small sample.
 * Compare before/after distribution.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProfilesJsonService } from '../src/profiles/profiles-json.service';
import { EvaluateService } from '../src/evaluate/evaluate.service';

const SAMPLE_IDS = ['2', '37', 'merged_14', '26', '18', 'merged_12'];

interface NoveltyStats {
  profileId: string;
  domain: string;
  oldValue: number | null;
  newValue: number | null;
  text: string;
  evidence: string;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const profilesJson = app.get(ProfilesJsonService);
  const evaluateService = app.get(EvaluateService);

  console.log('\n=== noveltyVsRoutine Prompt Tuning Validation ===\n');
  console.log('Sample: 6 profiles × 3 domains = 18 extractions\n');

  const stats: NoveltyStats[] = [];
  const oldDistribution = { low: 0, mid: 0, high: 0, null: 0 };
  const newDistribution = { low: 0, mid: 0, high: 0, null: 0 };

  for (const id of SAMPLE_IDS) {
    const profile = await profilesJson.getById(id);
    if (!profile?.texts) continue;

    console.log(`\nProcessing profile: ${id}`);

    // Get old values
    const oldSelf = profile.evaluation?.self?.signals?.noveltyVsRoutine ?? null;
    const oldPartner = profile.evaluation?.partner?.signals?.noveltyVsRoutine ?? null;
    const oldRelationship = profile.evaluation?.relationship?.signals?.noveltyVsRoutine ?? null;

    // Re-extract with new prompt
    const { result } = await evaluateService.evaluateBatch({
      aboutMe: profile.texts.aboutMe ?? '',
      aboutPartner: profile.texts.aboutPartner ?? '',
      aboutRelationship: profile.texts.aboutRelationship ?? '',
    });

    const newSelf = result.self.signals.noveltyVsRoutine ?? null;
    const newPartner = result.partner.signals.noveltyVsRoutine ?? null;
    const newRelationship = result.relationship.signals.noveltyVsRoutine ?? null;

    // Collect stats
    const domains = [
      { domain: 'self', old: oldSelf, new: newSelf, text: profile.texts.aboutMe ?? '', evidence: result.self.evidence },
      { domain: 'partner', old: oldPartner, new: newPartner, text: profile.texts.aboutPartner ?? '', evidence: result.partner.evidence },
      { domain: 'relationship', old: oldRelationship, new: newRelationship, text: profile.texts.aboutRelationship ?? '', evidence: result.relationship.evidence },
    ];

    for (const d of domains) {
      const evidenceItem = d.evidence.find((e: any) => e.signal === 'noveltyVsRoutine');
      stats.push({
        profileId: id,
        domain: d.domain,
        oldValue: d.old,
        newValue: d.new,
        text: d.text.slice(0, 80),
        evidence: evidenceItem?.quote ?? '(no evidence)',
      });

      // Update distributions
      if (d.old == null) oldDistribution.null++;
      else if (d.old >= 1 && d.old <= 3) oldDistribution.low++;
      else if (d.old >= 4 && d.old <= 7) oldDistribution.mid++;
      else if (d.old >= 8 && d.old <= 10) oldDistribution.high++;

      if (d.new == null) newDistribution.null++;
      else if (d.new >= 1 && d.new <= 3) newDistribution.low++;
      else if (d.new >= 4 && d.new <= 7) newDistribution.mid++;
      else if (d.new >= 8 && d.new <= 10) newDistribution.high++;
    }
  }

  // Print results
  console.log('\n\n=== Before/After Comparison ===\n');

  console.log('Distribution:');
  console.log(`  LOW (1-3):   ${oldDistribution.low} → ${newDistribution.low}`);
  console.log(`  MID (4-7):   ${oldDistribution.mid} → ${newDistribution.mid}`);
  console.log(`  HIGH (8-10): ${oldDistribution.high} → ${newDistribution.high}`);
  console.log(`  NULL:        ${oldDistribution.null} → ${newDistribution.null}`);

  const oldTotal = oldDistribution.low + oldDistribution.mid + oldDistribution.high;
  const newTotal = newDistribution.low + newDistribution.mid + newDistribution.high;
  console.log(`\nNon-null rate: ${oldTotal}/18 (${((oldTotal / 18) * 100).toFixed(1)}%) → ${newTotal}/18 (${((newTotal / 18) * 100).toFixed(1)}%)`);

  if (oldTotal > 0) {
    console.log(`\nOLD distribution breakdown:`);
    console.log(`  LOW: ${((oldDistribution.low / oldTotal) * 100).toFixed(1)}%`);
    console.log(`  MID: ${((oldDistribution.mid / oldTotal) * 100).toFixed(1)}%`);
    console.log(`  HIGH: ${((oldDistribution.high / oldTotal) * 100).toFixed(1)}%`);
  }

  if (newTotal > 0) {
    console.log(`\nNEW distribution breakdown:`);
    console.log(`  LOW: ${((newDistribution.low / newTotal) * 100).toFixed(1)}%`);
    console.log(`  MID: ${((newDistribution.mid / newTotal) * 100).toFixed(1)}%`);
    console.log(`  HIGH: ${((newDistribution.high / newTotal) * 100).toFixed(1)}%`);
  }

  console.log('\n\n=== Value Changes ===\n');
  for (const stat of stats) {
    if (stat.oldValue !== stat.newValue) {
      const change = stat.newValue == null ? 'removed' : stat.oldValue == null ? 'added' : `${stat.oldValue} → ${stat.newValue}`;
      console.log(`${stat.profileId} (${stat.domain}): ${change}`);
      console.log(`  Text: "${stat.text}${stat.text.length >= 80 ? '...' : ''}"`);
      console.log(`  Evidence: "${stat.evidence}"`);
      console.log('');
    }
  }

  console.log('\n✅ Validation complete.\n');
  await app.close();
}

main().catch(console.error);
