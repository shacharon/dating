/**
 * Sprint 73 Story 02 — organize dating-ui/src/lib into domain folders.
 * Run from repo root: node dating-ui/scripts/reorganize-lib-s73.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
const libRoot = path.join(repoRoot, 'dating-ui/src/lib');
const uiSrc = path.join(repoRoot, 'dating-ui/src');

/** basename (no extension) → destination folder under lib/ */
const LOCATION = {
  // auth/
  'token-storage': 'auth',
  'token-storage.spec': 'auth',
  'token-storage-types': 'auth',
  'token-storage-capacitor': 'auth',
  'token-storage-capacitor.spec': 'auth',
  'token-storage-react-native': 'auth',
  'token-storage-react-native.spec': 'auth',
  'session-cookie': 'auth',
  'session-cookie.spec': 'auth',
  'authenticated-fetch': 'auth',
  'authenticated-fetch.spec': 'auth',
  'auth-test-gate': 'auth',

  // api/
  'api-base': 'api',
  'api-base.spec': 'api',
  'api-client': 'api',
  'me-profile-api': 'api',
  'me-profile-api.spec': 'api',
  'me-matches-api': 'api',
  'me-photos-api': 'api',
  'me-analysis-api': 'api',
  'conversations-api': 'api',
  'conversations-api.moderation.spec': 'api',
  'profile-quality-api': 'api',
  'profile-quality-api.spec': 'api',
  'notification-preferences-api': 'api',
  'notification-preferences-api.spec': 'api',
  'delete-account-api': 'api',
  'delete-account-api.spec': 'api',
  'report-user-api': 'api',
  'report-user-options': 'api',
  'referral-attribution-api': 'api',

  // admin/
  'admin-content-violations-api': 'admin',
  'admin-fetch-error': 'admin',
  'admin-fetch-error.spec': 'admin',
  'admin-match-quality-api': 'admin',
  'admin-match-quality-api.spec': 'admin',
  'admin-photos-api': 'admin',
  'admin-reports-api': 'admin',
  'admin-routes-gate': 'admin',
  'admin-routes-gate.spec': 'admin',
  'internal-routes-gate': 'admin',
  'internal-routes-gate.spec': 'admin',

  // messaging/
  'conversation-focus': 'messaging',
  'conversation-list-controls': 'messaging',
  'conversation-list-controls.spec': 'messaging',
  'conversation-list-unread': 'messaging',
  'conversation-list-unread.spec': 'messaging',
  'conversation-message-limits': 'messaging',
  'conversation-unread-total': 'messaging',
  'conversation-unread-total.spec': 'messaging',
  'message-in-app-notify': 'messaging',
  'message-in-app-notify.spec': 'messaging',
  'message-toast.constants': 'messaging',
  'message-toast-labels': 'messaging',
  'message-toast-labels.spec': 'messaging',
  'messaging-socket': 'messaging',
  'messaging-socket.spec': 'messaging',
  'messaging-socket-auth': 'messaging',
  'messaging-socket-auth.spec': 'messaging',

  // matches/
  'match-photo': 'matches',
  'match-photo.spec': 'matches',
  'match-preferences-form': 'matches',
  'match-preferences-form.spec': 'matches',
  'enrichment-display-v1': 'matches',
  'enrichment-display-v1.format-shared-interest.spec': 'matches',
  'final-rule-signal-mapper': 'matches',
  'final-rule-signal-mapper.test': 'matches',
  'analysis-presentation': 'matches',
  'analysis-presentation.spec': 'matches',
  'pick-profile-photo': 'matches',
  'pick-profile-photo.spec': 'matches',

  // profile/
  'profile-completeness': 'profile',
  'profile-completeness.spec': 'profile',
  'profile-field-validation': 'profile',
  'profile-field-validation.spec': 'profile',
  'profile-form': 'profile',
  'profile-form.spec': 'profile',
  'onboarding-basic-validation': 'profile',
  'onboarding-basic-validation.spec': 'profile',
  'onboarding-path': 'profile',
  'onboarding-path.spec': 'profile',
  'phase25-profile-enrichment.spec': 'profile',

  // platform/
  'platform': 'platform',
  'platform.spec': 'platform',
  'capacitor-build': 'platform',
  'capacitor-build.spec': 'platform',
  'app-viewport': 'platform',
  'app-viewport.spec': 'platform',
  'image-remote-patterns': 'platform',
  'image-remote-patterns.spec': 'platform',
  'page-metadata': 'platform',
  'use-online-status': 'platform',
  'use-online-status.spec': 'platform',
  'realtime-mode': 'platform',
  'realtime-mode.spec': 'platform',

  // query/
  'query-keys': 'query',
  'query-retry': 'query',
  'query-retry.spec': 'query',
  'create-app-query-client': 'query',
  'create-app-query-client.spec': 'query',

  // moderation/
  'content-moderation-error': 'moderation',
  'content-moderation-error.spec': 'moderation',

  // referral/
  'referral-attribution': 'referral',
  'referral-attribution.spec': 'referral',
};

const FOLDERS = [
  'api',
  'admin',
  'messaging',
  'profile',
  'platform',
  'query',
  'moderation',
  'referral',
];

function gitMv(from, to) {
  execSync(`git mv "${from}" "${to}"`, { cwd: repoRoot, stdio: 'inherit' });
}

function basenameKey(filename) {
  return filename.replace(/\.(tsx?)$/, '');
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|jsx?|md|mjs|cjs|json)$/.test(ent.name)) out.push(full);
  }
  return out;
}

// --- 1) Create folders + git mv ---
for (const folder of FOLDERS) {
  fs.mkdirSync(path.join(libRoot, folder), { recursive: true });
}

let moved = 0;
const missing = [];
for (const [base, folder] of Object.entries(LOCATION)) {
  // Find matching file on disk (base may include .spec / .test)
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
  ];
  let found = null;
  for (const name of candidates) {
    const full = path.join(libRoot, name);
    if (fs.existsSync(full)) {
      found = name;
      break;
    }
  }
  if (!found) {
    missing.push(base);
    continue;
  }
  const from = path.join(libRoot, found);
  const to = path.join(libRoot, folder, found);
  if (fs.existsSync(to)) {
    console.warn('skip exists', to);
    continue;
  }
  gitMv(from, to);
  moved += 1;
}

console.log(`moved ${moved} files`);
if (missing.length) {
  console.warn('missing:', missing);
}

// --- 2) Rewrite @/lib/<basename> imports ---
// Sort basenames longest-first so "token-storage-capacitor" wins over "token-storage"
const relocBases = Object.keys(LOCATION)
  .filter((k) => !k.includes('.spec') && !k.includes('.test'))
  .sort((a, b) => b.length - a.length);

function rewriteContent(src) {
  let out = src;
  for (const base of relocBases) {
    const folder = LOCATION[base];
    // @/lib/base or @/lib/base.js — not already @/lib/folder/
    const re = new RegExp(
      `(@/lib/)${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w./-])`,
      'g',
    );
    out = out.replace(re, `$1${folder}/${base}`);
  }
  return out;
}

let rewritten = 0;
for (const file of walk(uiSrc)) {
  if (file.includes(`${path.sep}node_modules${path.sep}`)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = rewriteContent(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    rewritten += 1;
  }
}

// Also rewrite in dating-ui outside src if any (e.g. tests at root)
const uiRootExtras = [
  path.join(repoRoot, 'dating-ui'),
];
for (const root of uiRootExtras) {
  for (const name of ['vitest.config.ts', 'vitest.config.mts', 'next.config.ts', 'next.config.mjs', 'next.config.js']) {
    const full = path.join(root, name);
    if (!fs.existsSync(full)) continue;
    const before = fs.readFileSync(full, 'utf8');
    const after = rewriteContent(before);
    if (after !== before) {
      fs.writeFileSync(full, after);
      rewritten += 1;
    }
  }
}

console.log(`rewrote imports in ${rewritten} files`);
