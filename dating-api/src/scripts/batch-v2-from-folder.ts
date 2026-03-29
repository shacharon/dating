/**
 * Load profile JSON files from a local folder, upsert UserProfile, run V2 extraction, persist ProfileExtractionV2.
 *
 * Usage (from dating-api):
 *   npm run batch:v2-from-folder
 *   npm run batch:v2-from-folder -- --force
 *   npm run batch:v2-from-folder -- --batch-size=15 --dir=C:\\path\\to\\profiles
 *
 * Env:
 *   PROFILES_IMPORT_DIR — absolute or cwd-relative folder (default: data/profiles)
 *   BATCH_V2_FORCE=1 — re-run V2 even if ProfileExtractionV2 exists (use when npm eats --force on Windows)
 */

import { NestFactory } from '@nestjs/core';
import { isAbsolute, join, normalize } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractionV2Service } from '../extraction/extraction-v2.service';
import { ExtractionV2PersistenceService } from '../extraction/extraction-v2-persistence.service';
import type { ExtractionV2Result } from '../extraction/extraction-v2.service';

function sanitizeIdForFilename(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

interface ParsedRow {
  id: string;
  name: string;
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
  sourceFile: string;
}

function parseProfileJson(raw: string, basename: string): ParsedRow | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;

  const stem = basename.replace(/\.json$/i, '');
  const idRaw = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : stem;
  if (!idRaw) return null;
  const safe = sanitizeIdForFilename(idRaw);
  if (!safe) return null;

  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : 'Unknown';

  let aboutMe = '';
  let aboutPartner = '';
  let aboutRelationship = '';

  if (o.texts && typeof o.texts === 'object') {
    const t = o.texts as Record<string, unknown>;
    aboutMe = typeof t.aboutMe === 'string' ? t.aboutMe : '';
    aboutPartner = typeof t.aboutPartner === 'string' ? t.aboutPartner : '';
    aboutRelationship = typeof t.aboutRelationship === 'string' ? t.aboutRelationship : '';
  } else {
    aboutMe = typeof o.aboutMe === 'string' ? o.aboutMe : '';
    aboutPartner = typeof o.aboutPartner === 'string' ? o.aboutPartner : '';
    aboutRelationship = typeof o.aboutRelationship === 'string' ? o.aboutRelationship : '';
  }

  if (!aboutMe.trim()) return null;

  return {
    id: idRaw,
    name,
    aboutMe: aboutMe.trim(),
    aboutPartner: aboutPartner.trim(),
    aboutRelationship: aboutRelationship.trim(),
    sourceFile: basename,
  };
}

function nonNullSignals(s: Record<string, number | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) {
    if (v != null) out[k] = v;
  }
  return out;
}

function samplePayload(e: ExtractionV2Result): Record<string, unknown> {
  return {
    signals: {
      self: nonNullSignals(e.base.self.signals as Record<string, number | null>),
      partner: nonNullSignals(e.base.partner.signals as Record<string, number | null>),
      relationship: nonNullSignals(e.base.relationship.signals as Record<string, number | null>),
    },
    interests: {
      self: e.interests.self.map((i) => i.tag),
      partner: e.interests.partner.map((i) => i.tag),
      relationship: e.interests.relationship.map((i) => i.tag),
    },
    negatives: {
      self: e.negatives.self.map((n) => ({ category: n.category, tag: n.tag, strength: n.strength })),
      partner: e.negatives.partner.map((n) => ({ category: n.category, tag: n.tag, strength: n.strength })),
      relationship: e.negatives.relationship.map((n) => ({ category: n.category, tag: n.tag, strength: n.strength })),
    },
  };
}

function parseArgs(): { force: boolean; batchSize: number; dir: string } {
  const args = process.argv.slice(2);
  const envForce = process.env.BATCH_V2_FORCE === '1' || process.env.BATCH_V2_FORCE === 'true';
  const force = args.includes('--force') || envForce;
  let batchSize = 15;
  let dir = '';

  for (const a of args) {
    if (a.startsWith('--batch-size=')) {
      const n = parseInt(a.slice('--batch-size='.length), 10);
      if (!Number.isNaN(n)) batchSize = Math.min(20, Math.max(1, n));
    }
    if (a.startsWith('--dir=')) {
      dir = a.slice('--dir='.length).trim();
    }
  }

  const envDir = process.env.PROFILES_IMPORT_DIR?.trim() ?? '';
  if (!dir && envDir) dir = envDir;

  if (!dir) {
    dir = join(process.cwd(), 'data', 'profiles');
  } else if (!isAbsolute(dir)) {
    dir = join(process.cwd(), normalize(dir));
  }

  return { force, batchSize, dir };
}

async function main(): Promise<void> {
  const { force, batchSize, dir } = parseArgs();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prisma = app.get(PrismaService);
  const extractionV2 = app.get(ExtractionV2Service);
  const persistence = app.get(ExtractionV2PersistenceService);

  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith('.json')).sort();
  } catch (e) {
    console.error(`Cannot read directory: ${dir}`, e);
    await app.close();
    process.exit(1);
    return;
  }

  console.log(`\n=== batch-v2-from-folder ===`);
  console.log(`Folder: ${dir}`);
  console.log(`JSON files: ${files.length}`);
  console.log(`Batch size: ${batchSize}  force=${force}\n`);

  let skippedInvalid = 0;
  let skippedExistingV2 = 0;
  let success = 0;
  let failed = 0;
  const failures: { id: string; file: string; reason: string }[] = [];
  const samples: { profileId: string; name: string; sample: Record<string, unknown> }[] = [];

  const rows: ParsedRow[] = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf8');
    const row = parseProfileJson(raw, file);
    if (!row) {
      skippedInvalid++;
      console.log(`[SKIP invalid] ${file}`);
      continue;
    }
    rows.push(row);
  }

  const totalValid = rows.length;
  let batchIndex = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    batchIndex++;
    console.log(`--- batch ${batchIndex} (${batch.length} profiles) ---`);

    for (const row of batch) {
      try {
        await prisma.userProfile.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            name: row.name,
            aboutMe: row.aboutMe,
            aboutPartner: row.aboutPartner || null,
            aboutRelationship: row.aboutRelationship || null,
          },
          update: {
            name: row.name,
            aboutMe: row.aboutMe,
            aboutPartner: row.aboutPartner || null,
            aboutRelationship: row.aboutRelationship || null,
          },
        });

        if (!force && (await persistence.exists(row.id))) {
          skippedExistingV2++;
          console.log(`[SKIP v2 exists] ${row.id} (${row.sourceFile})`);
          continue;
        }

        const extraction = await extractionV2.extractAll(
          row.aboutMe,
          row.aboutPartner,
          row.aboutRelationship,
          row.id,
        );

        await persistence.save({
          profileId: row.id,
          aboutMe: row.aboutMe,
          aboutPartner: row.aboutPartner,
          aboutRelationship: row.aboutRelationship,
          extraction,
        });

        success++;
        console.log(`[OK] ${row.id} (${row.sourceFile}) tokens=${extraction._usage.totalTokens}`);

        if (samples.length < 3) {
          samples.push({
            profileId: row.id,
            name: row.name,
            sample: samplePayload(extraction),
          });
        }
      } catch (err) {
        failed++;
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ id: row.id, file: row.sourceFile, reason });
        console.error(`[FAIL] ${row.id} (${row.sourceFile}): ${reason}`);
      }
    }
  }

  const totalProcessed = files.length;

  console.log(`\n=== SUMMARY ===`);
  console.log(`JSON files seen:        ${totalProcessed}`);
  console.log(`Skipped (invalid):      ${skippedInvalid}`);
  console.log(`Valid rows:             ${totalValid}`);
  console.log(`Skipped (V2 exists):    ${skippedExistingV2}`);
  console.log(`V2 extract + persist OK: ${success}`);
  console.log(`Failed:                 ${failed}`);

  if (samples.length > 0) {
    console.log(`\n=== SAMPLE (up to 3) ===`);
    console.log(JSON.stringify(samples, null, 2));
  }

  if (failures.length > 0) {
    console.log(`\n=== FAILURES ===`);
    console.log(JSON.stringify(failures, null, 2));
  }

  console.log(`\nNext: see docs/NEXT_STEPS_MATCH_EVALUATION.md\n`);

  await app.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
