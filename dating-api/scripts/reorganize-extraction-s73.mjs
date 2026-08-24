/**
 * Sprint 73 Story 01 — rewrite imports after extraction/ folder move.
 * Run: node dating-api/scripts/reorganize-extraction-s73.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extractionRoot = path.join(__dirname, '../src/extraction');

/** basename (no .ts) → folder under extraction/ ('' = root) */
const LOCATION = {
  'extraction.service': '',
  'extraction-core.module': '',
  'extracted-signals.interface': '',
  'extracted-signals.spec': '',
  'extracted-interests.interface': '',
  'extracted-interests.spec': '',
  'extracted-negatives.interface': '',
  'extraction-llm.runner': 'core',
  'extraction-llm.runner.spec': 'core',
  'extraction-normalization': 'core',
  'extraction-normalization.interest.spec': 'core',
  'extraction-output.cleaner': 'core',
  'extraction-output.cleaner.spec': 'core',
  'extraction-usage': 'core',
  'extraction-usage.spec': 'core',
  'extraction-v2.schemas': 'core',
  'extraction.service.core.spec': 'core',
  'extraction.service.spec-support': 'core',
  'extraction-behavior-locks.spec': 'core',
  'extraction-spec-size.policy.spec': 'core',
  'extraction-prompt.builder': 'prompt',
  'extraction-prompt.builder.spec': 'prompt',
  'expansion-manifest': 'expansion',
  'expansion-manifest.spec': 'expansion',
  'expansion-09-interest-guidance': 'expansion',
  'extraction-pipeline-snapshots': 'pipeline',
  'extraction-pipeline-snapshots.spec': 'pipeline',
  'extraction-strict-validation': 'pipeline',
  'extraction-strict-validation.spec': 'pipeline',
  'pipeline-trace': 'pipeline',
};

for (let i = 1; i <= 15; i++) {
  const n = String(i).padStart(2, '0');
  LOCATION[`expansion-${n}-signal-definitions`] = 'expansion';
  LOCATION[`expansion-${n}-rollout.spec`] = 'expansion';
}
LOCATION['expansion-09-interest-guidance'] = 'expansion';
LOCATION['extraction-expansion-shadow-05-08.spec'] = 'shadow';
LOCATION['extraction-expansion-shadow-10-13.spec'] = 'shadow';
LOCATION['extraction-expansion-shadow-14-15-09.spec'] = 'shadow';
LOCATION['extraction-expansion-shadow-signal3-04.spec'] = 'shadow';

const OUTBOUND_PACKAGES = [
  'logger',
  'llm',
  'engine',
  'compatibility',
  'matches',
  'holy-grail-matching',
  'profiles',
  'evaluate',
];

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (ent.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function folderOf(filePath) {
  const rel = path.relative(extractionRoot, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  return parts.length === 1 ? '' : parts[0];
}

function importPath(fromFolder, targetBase) {
  const toFolder = LOCATION[targetBase];
  if (toFolder === undefined) return null;
  if (fromFolder === toFolder) return `./${targetBase}`;
  if (fromFolder === '') {
    return toFolder === '' ? `./${targetBase}` : `./${toFolder}/${targetBase}`;
  }
  if (toFolder === '') return `../${targetBase}`;
  return `../${toFolder}/${targetBase}`;
}

function rewriteFile(filePath) {
  const fromFolder = folderOf(filePath);
  let src = fs.readFileSync(filePath, 'utf8');
  const original = src;

  // 1) Fix outbound ../pkg → ../../pkg for files in subfolders
  if (fromFolder) {
    for (const pkg of OUTBOUND_PACKAGES) {
      const re = new RegExp(
        `(from ['"])\\.\\./(${pkg}(?:/[^'"]*)?)(['"])`,
        'g',
      );
      src = src.replace(re, `$1../../$2$3`);
    }
  }

  // 2) Rewrite relative imports that target known extraction modules
  src = src.replace(
    /from (['"])(\.\.?\/[^'"]+)\1/g,
    (full, quote, importPathRaw) => {
      // Only rewrite extraction-local style paths (./ or ../ without going to sibling packages wrongly)
      const cleaned = importPathRaw.replace(/\\/g, '/');
      // Skip already-rewritten ../../outbound
      if (cleaned.startsWith('../../')) return full;

      const baseMatch = cleaned.match(/(?:^\.\/|^\.\.\/)(?:[\w-]+\/)*([\w.-]+)$/);
      if (!baseMatch) return full;
      const base = baseMatch[1];
      if (!(base in LOCATION)) return full;

      // If path already has correct folder prefix, leave it
      const expected = importPath(fromFolder, base);
      if (!expected) return full;
      return `from ${quote}${expected}${quote}`;
    },
  );

  if (src !== original) {
    fs.writeFileSync(filePath, src);
    return true;
  }
  return false;
}

let changed = 0;
for (const f of walk(extractionRoot)) {
  if (rewriteFile(f)) {
    changed += 1;
    console.log('updated', path.relative(extractionRoot, f));
  }
}
console.log(`done: ${changed} files`);
