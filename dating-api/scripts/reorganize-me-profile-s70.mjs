/**
 * Sprint 70 Story 02 — mechanical me-profile/ directory reorganization.
 * Run from dating-api root: node scripts/reorganize-me-profile-s70.mjs
 *
 * Lessons from Story 01:
 * - Resolve imports via old location → RELOCATIONS → new relative path
 * - Outbound depth changes handled by re-resolving absolute targets
 * - External /me-profile/ paths rewritten by longest-old-key-first
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const meProfileDir = path.join(apiRoot, 'src/me-profile');

/** @type {Record<string, string>} old path from me-profile/ (no ext) -> new path */
const RELOCATIONS = {};

function add(dir, ...files) {
  for (const f of files) {
    const base = f.replace(/\.ts$/, '');
    RELOCATIONS[base] = `${dir}/${base}`.replace(/\/+/g, '/');
  }
}

/** Existing matches/ files: old key is matches/<base> */
function addFromMatches(dir, ...files) {
  for (const f of files) {
    const base = f.replace(/\.ts$/, '');
    RELOCATIONS[`matches/${base}`] = `${dir}/${base}`.replace(/\/+/g, '/');
  }
}

const ROOT_STAY = new Set([
  'me-profile.module',
  'me-profile.controller',
  'me-profile.dto',
  'me-profile.errors',
  'me-profile-validation.pipe',
]);

add(
  'profile',
  'me-profile.service.ts',
  'me-profile.service.spec.ts',
  'me-profile-analysis.service.ts',
  'me-profile-analysis.service.spec.ts',
  'me-profile-engine.mapper.ts',
  'me-profile-engine.mapper.spec.ts',
  'me-profile-photo-gate.ts',
  'me-profile-photo-gate.spec.ts',
  'profile-quality.service.ts',
  'profile-quality.service.spec.ts',
);

add(
  'conversations',
  'conversation-message.constants.ts',
  'conversation-message-rate-limit.error.ts',
  'conversation-message-rate-limit.service.ts',
  'conversation-message-rate-limit.service.spec.ts',
  'conversation-message-rate-limit.tokens.ts',
  'conversation-message-rate-limit-memory.store.ts',
  'conversation-message-rate-limit-redis.store.ts',
  'conversation-message-rate-limit-redis.spec.ts',
  'conversation-message-rate-limit-store.interface.ts',
  'conversation-message-rate-limit-store.provider.ts',
  'conversation-message-rate-limit-store.provider.spec.ts',
  'me-conversation-messages.dto.ts',
  'me-conversation-messages.service.ts',
  'me-conversation-messages.service.spec.ts',
  'me-conversations.service.ts',
  'me-conversations.service.spec.ts',
  'me-conversations.errors.ts',
  'me-conversations-list-cursor.ts',
  'me-conversations-list-cursor.spec.ts',
  'me-conversations-last-message-batch.spec.ts',
  'me-conversations-unread-batch.spec.ts',
);

add(
  'integration',
  'me-profile-http.shared-harness.ts',
  'me-profile-http-crud.integration.spec.ts',
  'me-profile-http-conversations.integration.spec.ts',
  'me-profile-http-photos.integration.spec.ts',
  'me-profile-http-matches-list-detail.integration.spec.ts',
  'me-profile-http-matches-narrative-feedback.integration.spec.ts',
  'me-profile-http-matches-actions.integration.spec.ts',
  'me-profile-http-matches-mutual.integration.spec.ts',
  'me-profile-http-matches.spec-support.ts',
  'me-profile-http-matches-spec-size.policy.spec.ts',
  'me-profile-http-split.wiring.spec.ts',
  'me-notification-preferences-http.integration.spec.ts',
  'me-profile.test-harness.ts',
  'me-conversation-messages-ws.integration.spec.ts',
);

add(
  'e2e',
  'me-new-model-e2e.integration.spec.ts',
  'me-new-model-e2e-dealbreaker.integration.spec.ts',
  'me-new-model-e2e-dealbreaker-guardrails.integration.spec.ts',
  'me-new-model-e2e-eligibility.integration.spec.ts',
  'me-new-model-e2e-hard-block-existing.integration.spec.ts',
  'me-new-model-e2e-match-narrative.integration.spec.ts',
  'me-new-model-e2e-pagination.integration.spec.ts',
  'me-new-model-e2e-photo-moderation.integration.spec.ts',
  'me-new-model-e2e-ranking.integration.spec.ts',
);

add(
  'contracts',
  'me-domain.error.ts',
  'user-profile-matching-bridge.contract.ts',
  'user-profile-matching-bridge.contract.spec.ts',
  'me-matches.v1-contract.spec.ts',
);

add(
  'matches/core',
  'me-matches.service.ts',
  'me-matches.service.spec.ts',
  'me-matches-response.mapper.ts',
  'me-matches-response.mapper.spec.ts',
  'me-profile-matches.service.ts',
  'me-profile-matches.service.spec.ts',
);

add(
  'matches/list',
  'match-list-candidate-cap.ts',
  'match-list-candidate-cap.spec.ts',
  'match-list-materialized-flag.ts',
  'match-list-materialized-flag.spec.ts',
  'me-matches-candidate-sql-prefilter.ts',
  'me-matches-candidate-sql-prefilter.spec.ts',
  'me-matches-materialized-list.spec.ts',
  'me-matches-read-model-policy.spec.ts',
);
addFromMatches(
  'matches/list',
  'match-list-cache.service.ts',
  'match-list-cache.service.spec.ts',
  'match-list-cache.scoring.spec.ts',
  'match-list-cursor.ts',
  'match-list-hard-block-pending.ts',
  'match-list-materialized.ts',
  'match-list-query.service.ts',
  'match-list.helpers.ts',
  'match-ranking.service.ts',
  'match-ranking.service.spec.ts',
);

add(
  'matches/rank',
  'match-list-rank-backfill.ts',
  'match-list-rank-backfill.spec.ts',
  'match-list-rank-persist.constants.ts',
  'match-list-rank-persist.spec.ts',
  'match-list-rank-score.ts',
  'match-list-rank.schema.spec.ts',
  'match-list-rebuild-budget.ts',
  'match-list-rebuild-budget.spec.ts',
  'match-list-rebuild-cap.spec.ts',
);
addFromMatches('matches/rank', 'match-list-rank.types.ts');

addFromMatches(
  'matches/detail',
  'match-detail.service.ts',
  'match-detail.service.spec.ts',
  'match-detail-narrative.ts',
  'match-eligibility.service.ts',
  'match-eligibility.service.spec.ts',
);

add(
  'matches/actions',
  'me-match-actions.service.ts',
  'me-match-actions.service.spec.ts',
  'me-match-actions.dto.ts',
  'me-match-feedback.service.ts',
  'me-match-feedback.service.spec.ts',
  'me-match-feedback.dto.ts',
  'mutual-matches.service.ts',
  'mutual-matches.service.spec.ts',
  'match-priority.ts',
  'match-priority.spec.ts',
  'match-quality-audit.ts',
  'match-quality-audit.v1-path.spec.ts',
);

add(
  'matches/support',
  'me-matches.spec-support.ts',
  'me-matches.test-harness.ts',
  'me-matches-eligibility.spec-support.ts',
  'match-narrative-test-stubs.ts',
  'me-matches.errors.ts',
);

/** @type {Record<string, string>} new rel (no ext) -> old rel (no ext) */
const OLD_LOCATION = {};
for (const [oldPath, newPath] of Object.entries(RELOCATIONS)) {
  OLD_LOCATION[newPath] = oldPath;
}

function gitMv(from, to) {
  const fromAbs = path.join(meProfileDir, from);
  const toAbs = path.join(meProfileDir, to);
  if (!fs.existsSync(fromAbs)) {
    console.warn('skip missing', from);
    return;
  }
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  execSync(`git mv "${fromAbs.replace(/\\/g, '/')}" "${toAbs.replace(/\\/g, '/')}"`, {
    cwd: apiRoot,
    stdio: 'inherit',
  });
}

function moveFiles() {
  for (const [oldBase, newRel] of Object.entries(RELOCATIONS)) {
    gitMv(`${oldBase}.ts`, `${newRel}.ts`);
  }
}

function newRelativeImport(fromFile, newTargetRel) {
  const fromDir = path.dirname(fromFile);
  let rel = path
    .relative(fromDir, path.join(meProfileDir, newTargetRel))
    .replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel.replace(/\.ts$/, '');
}

function stripExt(p) {
  return p.replace(/\\/g, '/').replace(/\.ts$/, '');
}

function rewriteRelativeImport(fromFileAbs, importSpec) {
  const newRel = stripExt(path.relative(meProfileDir, fromFileAbs));
  const oldRel = OLD_LOCATION[newRel] ?? newRel;
  const oldDirRel = oldRel.includes('/') ? path.posix.dirname(oldRel) : '';
  const oldFromDir = oldDirRel
    ? path.join(meProfileDir, oldDirRel)
    : meProfileDir;

  const oldTargetAbs = path.normalize(path.join(oldFromDir, importSpec));
  let targetRel = path.relative(meProfileDir, oldTargetAbs).replace(/\\/g, '/');

  // Outside me-profile (e.g. ../matches/engine, ../workers, ../auth)
  if (targetRel.startsWith('..') || path.isAbsolute(targetRel) === false && !targetRel) {
    if (targetRel.startsWith('..')) {
      let rel = path.relative(path.dirname(fromFileAbs), oldTargetAbs).replace(/\\/g, '/');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return rel.replace(/\.ts$/, '');
    }
  }

  targetRel = stripExt(targetRel);
  if (targetRel.startsWith('..')) {
    let rel = path.relative(path.dirname(fromFileAbs), oldTargetAbs).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return rel.replace(/\.ts$/, '');
  }

  // Inside me-profile — apply relocation if any
  if (RELOCATIONS[targetRel]) {
    targetRel = RELOCATIONS[targetRel];
  } else if (ROOT_STAY.has(targetRel)) {
    // stays
  }

  return newRelativeImport(fromFileAbs, targetRel);
}

function fixFileRelativeImports(content, fileAbs) {
  return content.replace(
    /from ['"](\.[^'"]+)['"]/g,
    (full, spec) => {
      if (!spec.startsWith('.')) return full;
      try {
        const newSpec = rewriteRelativeImport(fileAbs, spec);
        if (newSpec === spec) return full;
        return `from '${newSpec}'`;
      } catch {
        return full;
      }
    },
  );
}

function fixExternalMeProfileImports(content) {
  const sorted = Object.entries(RELOCATIONS).sort((a, b) => b[0].length - a[0].length);
  for (const [oldPath, newPath] of sorted) {
    const escaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // from '.../me-profile/OLD' and jest.mock('.../me-profile/OLD'
    content = content.replace(
      new RegExp(`(/me-profile/)${escaped}(?=['"])`, 'g'),
      `$1${newPath}`,
    );
  }
  return content;
}

function walkTs(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(full, out);
    else if (ent.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function fixAllImports() {
  const srcDir = path.join(apiRoot, 'src');
  for (const file of walkTs(srcDir)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    content = fixExternalMeProfileImports(content);
    if (file.startsWith(meProfileDir + path.sep) || file.startsWith(meProfileDir + '/')) {
      content = fixFileRelativeImports(content, file);
    }
    if (content !== original) {
      fs.writeFileSync(file, content);
    }
  }
}

function updatePackageJson() {
  const pkgPath = path.join(apiRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts['validate:new-model-e2e'] =
    'jest src/me-profile/e2e/me-new-model-e2e.integration.spec.ts --runInBand --no-coverage';
  pkg.scripts['validate:phase2-me-profile'] =
    'jest src/me-profile/profile/me-profile.service.spec.ts src/me-profile/integration/me-profile-http-crud.integration.spec.ts src/me-profile/integration/me-profile-http-matches-list-detail.integration.spec.ts src/me-profile/integration/me-profile-http-matches-narrative-feedback.integration.spec.ts src/me-profile/integration/me-profile-http-matches-actions.integration.spec.ts src/me-profile/integration/me-profile-http-matches-mutual.integration.spec.ts src/me-profile/integration/me-profile-http-conversations.integration.spec.ts src/me-profile/integration/me-profile-http-photos.integration.spec.ts src/me-profile/dto/me-profile-writable-fields.dto.spec.ts src/me-profile/contracts/user-profile-matching-bridge.contract.spec.ts --runInBand';
  pkg.scripts['smoke:ws'] =
    'jest src/messaging-realtime/messaging-realtime-ws.integration.spec.ts src/me-profile/integration/me-conversation-messages-ws.integration.spec.ts --runInBand';
  // smoke:me-profile pattern still matches integration/me-profile-http-*
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
  console.log('Done. Run: npm test -- me-profile/');
}
