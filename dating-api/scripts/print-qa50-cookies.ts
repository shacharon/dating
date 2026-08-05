/**
 * Print fixed QA50 viewer session cookies (from fixtures — no DB required).
 *
 * Usage: npm run qa50:cookies
 */

import { QA50_VIEWERS } from './qa50-fixtures';

console.log('\nQA50 fake logins — set cookie name: dating_session\n');
for (const v of QA50_VIEWERS) {
  console.log(
    `${v.key}  ${v.gender.padEnd(6)}  ${v.city.padEnd(14)}  ${v.rawSessionToken}`,
  );
}
console.log('\nThen open /dating/me-matches (after npm run qa50:ranks).\n');
console.log('Guide: docs/sprints/sprint-qa-local-pool/QA50_POOL.md\n');
