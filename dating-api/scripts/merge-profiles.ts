/**
 * Merge profiles from:
 * 1. Existing data/profiles/*.json (if any)
 * 2. profiles.zip contents (unzipped to ../../profiles_unzipped/profiles)
 * 3. 100-dating-profiles.json (generated list)
 *
 * Rule: NEVER overwrite same id. If an id already exists, assign a NEW id (merged_1, merged_2, ...).
 *
 * Run from dating-api root: npx ts-node scripts/merge-profiles.ts
 * Or: node dist/scripts/merge-profiles.js (after nest build)
 */

import { readdir, readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const DATA_PROFILES = join(ROOT, 'data', 'profiles');
// From dating-api root: workspace is bondit_webapp, src/find/profiles_unzipped/profiles
const ZIP_PROFILES_DIR = join(ROOT, '..', '..', 'profiles_unzipped', 'profiles');
const GENERATED_100 = join(ROOT, 'scripts', '100-dating-profiles.json');

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Minimal evaluation stub so raw profiles are valid ProfileJsonPayload (run analyze later to fill). */
function stubEvaluation() {
  const emptySignals: Record<string, number | null> = {
    ambition: null,
    socialBattery: null,
    healthBodyConsciousness: null,
    emotionalDepth: null,
    attachmentSecurity: null,
    directness: null,
    independence: null,
    traditionalism: null,
    financialMindset: null,
    relationshipClarity: null,
    spirituality: null,
    lifestylePace: null,
    physicalPriority: null,
    statusOrientation: null,
  };
  const emptyExtracted = {
    domain: 'self' as const,
    signals: { ...emptySignals },
    evidence: [],
    version: 'v1' as const,
    confidence: 0.4,
  };
  return {
    self: { ...emptyExtracted, domain: 'self' },
    partner: { ...emptyExtracted, domain: 'partner' },
    relationship: { ...emptyExtracted, domain: 'relationship' },
    compatibility: {
      selfVsPartner: { overallScore: 0, coverage: 0, matchedSignals: 0, hardMismatches: [], breakdown: [] },
      selfVsRelationship: { overallScore: 0, coverage: 0, matchedSignals: 0, hardMismatches: [], breakdown: [] },
    },
    display: { summary: 'Not yet analyzed.', insight: 'Run analyze to fill.' },
    productScores: {
      partnerFitScore: 0,
      relationshipFitScore: 0,
      coverageScore: 0,
      frictionRiskScore: 0,
      overallDecisionScore: 0,
      policyVersion: 'product-score-v1',
    },
    flags: [] as string[],
  };
}

interface FullPayload {
  id: string;
  name: string;
  texts: { aboutMe: string; aboutPartner: string; aboutRelationship: string };
  evaluation: unknown;
  savedAt: string;
}

interface RawProfile {
  id?: string;
  name: string;
  aboutMe: string;
  aboutPartner?: string;
  aboutRelationship?: string;
}

function ensureUniqueId(used: Set<string>): string {
  let n = 1;
  while (used.has(`merged_${n}`)) n++;
  const candidate = `merged_${n}`;
  used.add(candidate);
  return candidate;
}

async function loadExistingProfiles(): Promise<FullPayload[]> {
  try {
    const entries = await readdir(DATA_PROFILES);
    const jsonFiles = entries.filter((f) => f.endsWith('.json') && !f.endsWith('.json.tmp'));
    const out: FullPayload[] = [];
    for (const f of jsonFiles) {
      const raw = await readFile(join(DATA_PROFILES, f), 'utf8');
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === 'object' && 'id' in p && 'name' in p && 'texts' in p && 'evaluation' in p && 'savedAt' in p) {
        out.push(p as FullPayload);
      }
    }
    return out;
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') return [];
    throw e;
  }
}

async function loadZipProfiles(): Promise<FullPayload[]> {
  try {
    const entries = await readdir(ZIP_PROFILES_DIR);
    const jsonFiles = entries.filter((f) => f.endsWith('.json'));
    const out: FullPayload[] = [];
    for (const f of jsonFiles) {
      const raw = await readFile(join(ZIP_PROFILES_DIR, f), 'utf8');
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === 'object' && 'id' in p && 'name' in p && 'texts' in p && 'evaluation' in p && 'savedAt' in p) {
        out.push(p as FullPayload);
      }
    }
    return out;
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') {
      console.warn('Zip profiles dir not found:', ZIP_PROFILES_DIR);
      return [];
    }
    throw e;
  }
}

async function loadGenerated100(): Promise<RawProfile[]> {
  const raw = await readFile(GENERATED_100, 'utf8');
  const arr = JSON.parse(raw) as unknown;
  if (!Array.isArray(arr)) return [];
  return arr as RawProfile[];
}

async function writeProfile(payload: FullPayload): Promise<void> {
  const safeId = sanitizeId(payload.id);
  if (!safeId) throw new Error('Id sanitized to empty');
  await mkdir(DATA_PROFILES, { recursive: true });
  const full = { ...payload, savedAt: payload.savedAt || new Date().toISOString() };
  const tmpPath = join(DATA_PROFILES, `${safeId}.json.tmp`);
  const filePath = join(DATA_PROFILES, `${safeId}.json`);
  await writeFile(tmpPath, JSON.stringify(full, null, 2), 'utf8');
  await rename(tmpPath, filePath);
}

async function main(): Promise<void> {
  const usedIds = new Set<string>();

  // 1) Existing data/profiles – keep as-is
  const existing = await loadExistingProfiles();
  for (const p of existing) {
    const id = p.id;
    if (usedIds.has(id)) {
      const newId = ensureUniqueId(usedIds);
      console.log(`[existing] id ${id} already taken → new id ${newId}`);
      await writeProfile({ ...p, id: newId });
    } else {
      usedIds.add(id);
      await writeProfile(p);
    }
  }
  console.log(`Existing: ${existing.length} profiles`);

  // 2) Zip profiles – keep id if not taken, else new id
  const zipProfiles = await loadZipProfiles();
  for (const p of zipProfiles) {
    const id = String(p.id || '');
    const finalId = usedIds.has(id) ? ensureUniqueId(usedIds) : id;
    if (finalId !== id) console.log(`[zip] id ${id} → new id ${finalId}`);
    if (finalId === id) usedIds.add(id);
    await writeProfile({ ...p, id: finalId });
  }
  console.log(`From zip: ${zipProfiles.length} profiles`);

  // 3) Generated 100 – keep id if not taken, else new id; add stub evaluation
  let generated: RawProfile[];
  try {
    generated = await loadGenerated100();
  } catch (e) {
    console.warn('100-dating-profiles.json not found or invalid:', (e as Error).message);
    generated = [];
  }
  const stub = stubEvaluation();
  for (const r of generated) {
    const id = String(r.id ?? '');
    const finalId = usedIds.has(id) ? ensureUniqueId(usedIds) : (id || ensureUniqueId(usedIds));
    if (finalId !== id && id) console.log(`[generated] id ${id} → new id ${finalId}`);
    if (!usedIds.has(finalId)) usedIds.add(finalId);
    const payload: FullPayload = {
      id: finalId,
      name: r.name || 'Unknown',
      texts: {
        aboutMe: r.aboutMe ?? '',
        aboutPartner: r.aboutPartner ?? '',
        aboutRelationship: r.aboutRelationship ?? '',
      },
      evaluation: stub,
      savedAt: new Date().toISOString(),
    };
    await writeProfile(payload);
  }
  console.log(`Generated 100: ${generated.length} profiles`);

  console.log(`\nMerged total: ${usedIds.size} profiles in ${DATA_PROFILES}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
