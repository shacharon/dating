/**
 * Sprint 70 Story 01 — mechanical matches/ directory reorganization.
 * Run from dating-api root: node scripts/reorganize-matches-s70.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchesDir = path.join(apiRoot, 'src/matches');

/** @type {Record<string, string>} old path from matches/ (no ext) -> new path */
const RELOCATIONS = {};

function add(dir, ...files) {
  for (const f of files) {
    const base = f.replace(/\.ts$/, '');
    RELOCATIONS[base] = `${dir}/${base}`.replace(/\/+/g, '/');
  }
}

const ROOT_STAY = new Set([
  'matches.module',
  'matches.controller',
  'matches-api.controller',
  'matches.service',
  'match.types',
]);

add('admin', 'admin-pair-match.evaluator.ts', 'admin-pair-match.evaluator.spec.ts');
add(
  'api',
  'matches-analytics.service.ts',
  'matches-scan.service.ts',
  'matches-list.pipeline.ts',
  'matches.service.spec.ts',
  'matches-api-smoke.integration.spec.ts',
  'locked-expensive-endpoints-http.integration.spec.ts',
  'match-daemon.service.ts',
);
add(
  'children-unsure',
  'children-unsure.helpers.ts',
  'children-unsure.query.ts',
  'children-unsure.product-policy.ts',
  'children-unsure-profile-row.types.ts',
  'children-unsure-analytics.constants.ts',
  'children-unsure-analytics.service.ts',
  'children-unsure.hardening.spec.ts',
);
add(
  'compare',
  'compare-hg-first-helpers.ts',
  'compare-hg-first-helpers.spec.ts',
  'match-pair-hg-snapshot.ts',
  'match-pair-hg-snapshot.spec.ts',
  'shadow-hg-vs-legacy-metrics.ts',
  'shadow-hg-vs-legacy-metrics.spec.ts',
);
add(
  'engine',
  'match-engine.ts',
  'match-engine.types.ts',
  'match-engine.spec-support.ts',
  'match-engine.compare.spec.ts',
  'match-engine.compare-path-coverage.spec.ts',
  'match-engine-expansion-shadow-01-04.spec.ts',
  'match-engine-expansion-shadow-05-09.spec.ts',
  'match-engine-expansion-shadow-10-13.spec.ts',
  'match-engine-expansion-shadow-14-15.spec.ts',
  'match-engine-spec-size.policy.spec.ts',
  'scoring.ts',
  'scoring.spec.ts',
  'friction-policy.ts',
  'matching-algorithm.constants.ts',
  'match-score.util.ts',
  'match-score.util.spec.ts',
  'match-id.ts',
);
add(
  'explainability/core',
  'match-explainability.ts',
  'match-explainability.spec.ts',
  'match-explanation-traits.ts',
  'match-explanation-traits.spec.ts',
  'explainability-review-heuristics.ts',
  'explainability-review-heuristics.spec.ts',
  'expansion-explainability-config.ts',
  'expansion-explainability-config.spec.ts',
  'expansion-explainability-manifest.ts',
  'expansion-explainability-manifest.spec.ts',
  'expansion-explainability-wiring.spec.ts',
  'expansion-shadow-breakdown.ts',
  'expansion-shadow-breakdown.spec.ts',
);
for (let i = 1; i <= 7; i++) {
  const n = String(i).padStart(2, '0');
  add(
    'explainability/expansions/01-07',
    `expansion-${n}-explainability.ts`,
    `expansion-${n}-explainability.spec.ts`,
  );
}
for (let i = 10; i <= 15; i++) {
  add(
    'explainability/expansions/10-15',
    `expansion-${i}-explainability.ts`,
    `expansion-${i}-explainability.spec.ts`,
  );
}
add(
  'holy-grail',
  'holy-grail-pair-directions.ts',
  'holy-grail-pair-snapshot-telemetry.service.ts',
  'holy-grail-match-diagnostics.wire.ts',
  'holy-grail-match-diagnostics.wire.spec.ts',
  'hg-list-admission-gate.ts',
  'hg-list-admission-gate.spec.ts',
  'hg-list-admission-gate.constants.ts',
  'hg-compare-diagnostic.constants.ts',
);
add(
  'policies',
  'calibration-policy.ts',
  'coverage-policy.ts',
  'coverage-policy.spec.ts',
  'interest-alignment.ts',
  'interest-alignment.spec.ts',
);
add(
  'presentation',
  'match-teaser.ts',
  'match-teaser.spec.ts',
  'match-list-tldr.ts',
  'match-list-tldr.spec.ts',
  'match-short-reason.ts',
  'match-preview.mapper.ts',
  'match-detail-ui.mapper.ts',
  'match-detail-ui.mapper.spec.ts',
  'match-detail-children-unsure.ts',
  'display-policy.ts',
);
add(
  'recommendation',
  'match-recommendation.ts',
  'match-recommendation.spec.ts',
  'match-recommendation-refined.spec.ts',
  'match-recommendation.samples.ts',
  'match-ranking-contract.ts',
);

const COMPARE_STAGES_FILES = [
  'assemble-result.ts',
  'compatibility-nuance.spec.ts',
  'compatibility-nuance.ts',
  'coverage-asymmetry-friction.ts',
  'dealbreakers-balance.ts',
  'derive-contexts.ts',
  'directional-compatibility.ts',
  'relationship-fit-values.ts',
  'util.ts',
];
for (const name of COMPARE_STAGES_FILES) {
  const base = name.replace(/\.ts$/, '');
  RELOCATIONS[`compare-stages/${base}`] = `compare/compare-stages/${base}`;
}

function gitMv(from, to) {
  const fromAbs = path.join(matchesDir, from);
  const toAbs = path.join(matchesDir, to);
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  execSync(`git mv "${fromAbs.replace(/\\/g, '/')}" "${toAbs.replace(/\\/g, '/')}"`, {
    cwd: apiRoot,
    stdio: 'inherit',
  });
}

function moveFiles() {
  for (const [oldBase, newRel] of Object.entries(RELOCATIONS)) {
    if (oldBase.includes('/')) {
      gitMv(`${oldBase}.ts`, `${newRel}.ts`);
      continue;
    }
    const from = `${oldBase}.ts`;
    const to = `${newRel}.ts`;
    if (!fs.existsSync(path.join(matchesDir, from))) {
      console.warn('skip missing', from);
      continue;
    }
    gitMv(from, to);
  }
  // compare-stages dir emptied by individual moves above
  const csDir = path.join(matchesDir, 'compare-stages');
  if (fs.existsSync(csDir)) {
    const remaining = fs.readdirSync(csDir);
    if (remaining.length === 0) {
      fs.rmdirSync(csDir);
    }
  }
}

/** @type {Record<string, string>} new rel (no ext) -> old rel (no ext) */
const OLD_LOCATION = {};
for (const [oldPath, newPath] of Object.entries(RELOCATIONS)) {
  OLD_LOCATION[newPath] = oldPath;
}

function newRelativeImport(fromFile, newTargetRel) {
  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, path.join(matchesDir, newTargetRel)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel.replace(/\.ts$/, '');
}

function fixExternalMatchesImports(content) {
  const sorted = Object.entries(RELOCATIONS).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [oldPath, newPath] of sorted) {
    const escaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(
      new RegExp(`(/matches/)${escaped}(?=['"])`, 'g'),
      `$1${newPath}`,
    );
  }
  return content;
}

function fixFileImports(content, fileAbs) {
  const newRel = path
    .relative(matchesDir, fileAbs)
    .replace(/\\/g, '/')
    .replace(/\.ts$/, '');
  const oldRel = OLD_LOCATION[newRel] ?? newRel;
  const oldDir = oldRel.includes('/') ? path.posix.dirname(oldRel) : '';

  return content.replace(/from ['"](\.\/[^'"]+)['"]/g, (full, spec) => {
    if (!spec.startsWith('./')) return full;

    const joined = oldDir ? path.posix.join(oldDir, spec) : spec;
    const oldTarget = path.posix.normalize(joined).replace(/^\.\//, '');

    if (oldTarget.startsWith('..')) return full;

    const newTarget = RELOCATIONS[oldTarget] ?? oldTarget;
  if (newTarget === oldTarget && oldRel === newRel) return full;
    if (ROOT_STAY.has(oldTarget)) {
      const newSpec = newRelativeImport(fileAbs, oldTarget);
      return `from '${newSpec}'`;
    }

    const newSpec = newRelativeImport(fileAbs, newTarget);
    return `from '${newSpec}'`;
  });
}

function walkTs(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(full, out);
    else if (ent.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function fixRootStayImports(content, fileAbs) {
  const newRelPath = path
    .relative(matchesDir, path.dirname(fileAbs))
    .replace(/\\/g, '/');
  if (!newRelPath) return content;

  return content.replace(/from ['"](\.\/[^'"]+)['"]/g, (full, spec) => {
    const moduleName = spec.slice(2);
    if (!ROOT_STAY.has(moduleName)) return full;
    const newSpec = newRelativeImport(fileAbs, moduleName);
    return `from '${newSpec}'`;
  });
}

function fixCompareStagesImports(content, fileAbs) {
  const newRel = path
    .relative(matchesDir, fileAbs)
    .replace(/\\/g, '/')
    .replace(/\.ts$/, '');
  const oldRel = OLD_LOCATION[newRel] ?? newRel;
  if (!oldRel.startsWith('compare-stages/')) return content;

  const fromDir = path.dirname(fileAbs);

  content = content.replace(/from ['"]\.\.\/([^'"]+)['"]/g, (full, rest) => {
    const base = rest.split('/')[0];
    const relocatedBase = RELOCATIONS[base] ?? base;
    const newRest = rest.includes('/')
      ? `${relocatedBase}/${rest.split('/').slice(1).join('/')}`
      : relocatedBase;
    const newSpec = newRelativeImport(fileAbs, newRest);
    return `from '${newSpec}'`;
  });

  content = content.replace(/from ['"]((?:\.\.\/)+)([^'"]+)['"]/g, (full, dots, rest) => {
    const spec = `${dots}${rest}`;
    if (importTargetExists(fromDir, spec)) return full;
    const deeper = `../${spec}`;
    if (importTargetExists(fromDir, deeper)) return `from '${deeper}'`;
    return full;
  });

  return content;
}

function importTargetExists(fromDir, spec) {
  const target = path.normalize(path.join(fromDir, spec));
  return (
    fs.existsSync(`${target}.ts`) ||
    fs.existsSync(path.join(target, 'index.ts'))
  );
}

function fixOutboundImportsFromOriginal(content, fileAbs) {
  const newRelPath = path
    .relative(matchesDir, path.dirname(fileAbs))
    .replace(/\\/g, '/');
  if (!newRelPath) return content;

  const fileBase = path.basename(fileAbs, '.ts');
  const newRel = `${newRelPath}/${fileBase}`;
  const oldRel = OLD_LOCATION[newRel] ?? newRel;
  if (oldRel.includes('/') || oldRel === newRel) return content;

  const prefix = '../'.repeat(newRelPath.split('/').length);

  return content.replace(/from ['"]\.\.\/([^'"]+)['"]/g, (full, rest) => {
    return `from '${prefix}../${rest}'`;
  });
}

function fixUnmovedFolderImports(content, fileAbs) {
  const relDir = path.relative(matchesDir, path.dirname(fileAbs)).replace(/\\/g, '/');
  if (!relDir || OLD_LOCATION[`${relDir}/${path.basename(fileAbs, '.ts')}`]) {
    return content;
  }

  return content.replace(/from ['"]\.\.\/([^'"]+)['"]/g, (full, rest) => {
    const base = rest.split('/')[0];
    if (!RELOCATIONS[base]) return full;
    const fromDir = path.dirname(fileAbs);
    if (importTargetExists(fromDir, `../${rest}`)) return full;
    const relocatedBase = RELOCATIONS[base];
    const newRest = rest.includes('/')
      ? `${relocatedBase}/${rest.split('/').slice(1).join('/')}`
      : relocatedBase;
    const newSpec = newRelativeImport(fileAbs, newRest);
    return `from '${newSpec}'`;
  });
}

function fixAllImports() {
  const srcDir = path.join(apiRoot, 'src');
  for (const file of walkTs(srcDir)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    content = fixExternalMatchesImports(content);
    if (file.startsWith(matchesDir)) {
      content = fixOutboundImportsFromOriginal(content, file);
      content = fixFileImports(content, file);
      content = fixRootStayImports(content, file);
      content = fixCompareStagesImports(content, file);
      content = fixUnmovedFolderImports(content, file);
    }
    if (content !== original) {
      fs.writeFileSync(file, content);
    }
  }
}

function updatePackageJson() {
  const pkgPath = path.join(apiRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts['smoke:matches'] =
    'jest src/matches/api/matches-api-smoke.integration.spec.ts --runInBand';
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

if (process.argv.includes('--fix-only')) {
  console.log('Fixing imports only...');
  fixAllImports();
  console.log('Done.');
} else {
  console.log('Moving files...');
  moveFiles();
  console.log('Fixing imports...');
  fixAllImports();
  updatePackageJson();
  console.log('Done. Run: npm test -- matches/');
}
