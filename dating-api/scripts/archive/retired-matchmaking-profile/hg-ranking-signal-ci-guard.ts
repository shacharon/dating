/**
 * DEPRECATED: legacy HG ranking CI guard is retired before MatchmakingProfile drop.
 *
 * Run: npx ts-node scripts/hg-ranking-signal-ci-guard.ts
 *      npm run ci:hg-ranking-guard
 */

export const CI_GUARD_ACTIVE = true;

function main(): void {
  throw new Error(
    'DEPRECATED: scripts/hg-ranking-signal-ci-guard.ts is retired in pre–Migration 4 tooling cleanup.',
  );
}

main();
