/**
 * Warn-only soft LOC check for specs / spec-support under dating-api/src.
 * Always exits 0. See dating-api/docs/SPEC_BUDGET.md.
 *
 * Soft maxima (physical lines):
 *   *.spec-support.ts                          → 1200
 *   /matches/ path or *.integration.spec.ts    → 900
 *   other *.spec.ts                            → 400
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOFT_SUPPORT = 1200;
const SOFT_COLLAB_OR_INTEGRATION = 900;
const SOFT_FOCUSED = 400;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

/**
 * @param {string} absPath
 * @returns {number}
 */
function softMaxFor(absPath) {
  const base = path.basename(absPath);
  const norm = absPath.split(path.sep).join('/');
  if (base.endsWith('.spec-support.ts')) return SOFT_SUPPORT;
  if (norm.includes('/matches/') || base.endsWith('.integration.spec.ts')) {
    return SOFT_COLLAB_OR_INTEGRATION;
  }
  return SOFT_FOCUSED;
}

/**
 * @param {string} dir
 * @param {(p: string) => boolean} pred
 * @param {string[]} out
 */
function walk(dir, pred, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walk(full, pred, out);
      continue;
    }
    if (pred(full)) out.push(full);
  }
}

/**
 * @param {string} filePath
 * @returns {number}
 */
function countLines(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (text.length === 0) return 0;
  const parts = text.split(/\r?\n/);
  // Trailing newline → last empty segment; count physical lines like editors.
  return parts.length > 0 && parts[parts.length - 1] === ''
    ? parts.length - 1
    : parts.length;
}

const files = [];
walk(
  srcRoot,
  (p) => p.endsWith('.spec.ts') || p.endsWith('.spec-support.ts'),
  files,
);
files.sort((a, b) => a.localeCompare(b));

/** @type {{ rel: string, lines: number, soft: number }[]} */
const offenders = [];

for (const abs of files) {
  const lines = countLines(abs);
  const soft = softMaxFor(abs);
  if (lines > soft) {
    offenders.push({
      rel: path.relative(path.join(__dirname, '..'), abs).split(path.sep).join('/'),
      lines,
      soft,
    });
  }
}

offenders.sort((a, b) => b.lines - a.lines);

console.log('Spec budget check (warn-only) — see docs/SPEC_BUDGET.md');
console.log(
  `Scanned ${files.length} files under src/ (soft: focused≤${SOFT_FOCUSED}, collab/integration≤${SOFT_COLLAB_OR_INTEGRATION}, support≤${SOFT_SUPPORT})`,
);

if (offenders.length === 0) {
  console.log('No files over soft thresholds.');
} else {
  console.log(`\n${offenders.length} file(s) over soft threshold:\n`);
  for (const o of offenders) {
    console.log(`  ${o.lines}\t(soft ${o.soft})\t${o.rel}`);
  }
  console.log(
    '\nGuidance only — exit 0. Add an ownership header or split; do not fail CI without team agreement.',
  );
}

process.exit(0);
