/**
 * Dump Sprint 21 compare fields for the three fixture pairs (in-memory, no DB).
 *
 * Usage (from dating-api):
 *   npx ts-node --project tsconfig.json scripts/verify-sprint21-fixtures.ts
 */

import { compareWithStatus } from '../src/matches/match-engine';
import { SPRINT21_PAIRS } from './sprint21-fixtures';

function isScored(
  r: ReturnType<typeof compareWithStatus>,
): r is Extract<ReturnType<typeof compareWithStatus>, { finalScore: number }> {
  return (
    typeof (r as { finalScore?: unknown }).finalScore === 'number' &&
    !('status' in r)
  );
}

function main() {
  let failures = 0;

  for (const pair of SPRINT21_PAIRS) {
    console.log('\n════════════════════════════════════════');
    console.log(`PAIR: ${pair.id} — ${pair.label}`);
    console.log('════════════════════════════════════════');

    const result = compareWithStatus(pair.a, pair.b);
    if (!isScored(result)) {
      console.error('  FAIL: guard result', result);
      failures += 1;
      continue;
    }

    const note = result.explainability.sharedInterestNote;
    const chips = result.explainability.positiveChips;
    const conflictChip = chips.includes('Conflict approach');

    console.log(
      JSON.stringify(
        {
          aId: pair.a.id,
          bId: pair.b.id,
          interestAlignment: result.interestAlignment,
          valuesAlignment: result.valuesAlignment,
          compatibility: result.compatibility,
          finalScore: result.finalScore,
          coveragePercent: result.coveragePercent,
          positiveChips: chips,
          conflictApproachChip: conflictChip,
          sharedInterestNote: note ?? null,
          reasonShort: result.explainability.reasonShort,
        },
        null,
        2,
      ),
    );

    const checks: Array<[string, boolean]> = [];

    if (pair.expect.interestAlignmentMax !== undefined) {
      checks.push([
        `interestAlignment <= ${pair.expect.interestAlignmentMax}`,
        result.interestAlignment <= pair.expect.interestAlignmentMax,
      ]);
    }
    if (pair.expect.interestAlignmentMin !== undefined) {
      checks.push([
        `interestAlignment >= ${pair.expect.interestAlignmentMin}`,
        result.interestAlignment >= pair.expect.interestAlignmentMin,
      ]);
    }
    checks.push([
      `sharedInterestNote present=${pair.expect.sharedInterestNotePresent}`,
      pair.expect.sharedInterestNotePresent
        ? typeof note === 'string' && note.length > 0
        : note === undefined,
    ]);
    if (pair.expect.conflictStyleOnBoth) {
      checks.push([
        'coverage denominator uses 15 keys (conflictStyle present)',
        result.coveragePercent > 0,
      ]);
    }

    for (const [label, ok] of checks) {
      console.log(`  ${ok ? '✓' : '✗'} ${label}`);
      if (!ok) failures += 1;
    }
  }

  console.log('\n────────────────────────────────────────');
  if (failures > 0) {
    console.error(`FAILED: ${failures} check(s)`);
    process.exit(1);
  }
  console.log('OK: all Sprint 21 fixture checks passed');
}

main();
