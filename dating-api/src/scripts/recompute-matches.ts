/**
 * CLI script: recompute all matches using the new scoring engine.
 * 1) Load all profiles from repository
 * 2) Run recomputeAllMatches()
 * 3) Store results in matches table (data/matches/*.json)
 * 4) Keep previous matches but mark with policyVersion
 *
 * Run: npm run recompute-matches
 * Optional: --verbose to log each match (coveragePercent, coverageFactor, finalScore).
 */

import { readdir, readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import type { MatchRecordDto } from '../matches/match.types';
import { resolveEngineFinalScore } from '../matches/engine/match-score.util';
import { recomputeAllMatches, RECOMPUTE_POLICY_VERSION } from '../engine/recompute';

const PROFILES_DIR = process.env.PROFILES_DATA_DIR?.trim() || join(process.cwd(), 'data', 'profiles');
const MATCHES_DIR = process.env.MATCHES_DATA_DIR?.trim() || join(process.cwd(), 'data', 'matches');

const verbose = process.argv.includes('--verbose');

function sanitizeMatchId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function toMatchId(aId: string, bId: string): string {
  const [minId, maxId] = [aId, bId].sort((x, y) => x.localeCompare(y));
  return `${minId}__${maxId}`;
}

async function loadAllProfiles(): Promise<ProfileJsonPayload[]> {
  let entries: string[];
  try {
    entries = await readdir(PROFILES_DIR);
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') {
      console.error(`Profiles directory not found: ${PROFILES_DIR}`);
      process.exit(1);
    }
    throw err;
  }

  const profiles: ProfileJsonPayload[] = [];
  const jsonFiles = entries.filter((f) => f.endsWith('.json') && !f.endsWith('.json.tmp'));

  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(PROFILES_DIR, file), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        'id' in parsed &&
        'name' in parsed &&
        'texts' in parsed &&
        'evaluation' in parsed &&
        'savedAt' in parsed
      ) {
        profiles.push(parsed as ProfileJsonPayload);
      }
    } catch {
      // skip invalid JSON
    }
  }

  return profiles;
}

async function loadExistingMatchesAverage(): Promise<{ count: number; avgScore: number }> {
  let entries: string[];
  try {
    entries = await readdir(MATCHES_DIR);
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') return { count: 0, avgScore: 0 };
    throw err;
  }

  const jsonFiles = entries.filter(
    (f) => f.endsWith('.json') && !f.endsWith('.json.tmp') && f !== 'index.json',
  );
  let sum = 0;
  let count = 0;

  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(MATCHES_DIR, file), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        ('finalScore' in parsed || 'overall' in parsed)
      ) {
        const score = resolveEngineFinalScore(parsed as MatchRecordDto);
        sum += score;
        count++;
      }
    } catch {
      // skip
    }
  }

  const avgScore = count > 0 ? sum / count : 0;
  return { count, avgScore };
}

async function saveMatch(record: MatchRecordDto & { policyVersion?: string }): Promise<void> {
  const safeId = sanitizeMatchId(record.matchId);
  if (!safeId) throw new Error('matchId sanitized to empty');

  await mkdir(MATCHES_DIR, { recursive: true });

  const filePath = join(MATCHES_DIR, `${safeId}.json`);
  let createdAt = record.createdAt;
  const updatedAt = new Date().toISOString();

  try {
    const existing = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(existing) as MatchRecordDto;
    if (parsed?.createdAt) createdAt = parsed.createdAt;
  } catch {
    // new file
  }

  const toWrite = {
    ...record,
    createdAt,
    updatedAt,
    policyVersion: record.policyVersion ?? RECOMPUTE_POLICY_VERSION,
  };

  const tmpPath = join(MATCHES_DIR, `${safeId}.json.tmp`);
  await writeFile(tmpPath, JSON.stringify(toWrite, null, 2), 'utf8');
  await rename(tmpPath, filePath);
}

async function main(): Promise<void> {
  console.log('Loading profiles...');
  const profiles = await loadAllProfiles();
  if (profiles.length === 0) {
    console.log('No profiles found. Exiting.');
    process.exit(0);
  }

  console.log('Recomputing matches...');
  const results = await recomputeAllMatches(profiles);

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  for (const r of results) {
    const profileA = profileById.get(r.userA);
    const profileB = profileById.get(r.userB);
    if (!profileA || !profileB) continue;

    const matchId = toMatchId(r.userA, r.userB);
    if (verbose) {
      console.debug({
        matchId,
        coveragePercent: r.coveragePercent,
        coverageFactor: r.coverageFactor,
        finalScore: r.finalScore,
      });
    }

    const now = new Date().toISOString();

    const record: MatchRecordDto & { policyVersion: string } = {
      matchId,
      aId: r.userA,
      bId: r.userB,
      a: { id: profileA.id, name: profileA.name },
      b: { id: profileB.id, name: profileB.name },
      createdAt: now,
      updatedAt: now,
      aToB: r.aToB,
      bToA: r.bToA,
      relationshipStyle: r.relationshipStyle,
      coverage: r.coverage,
      frictionRisk: r.frictionRisk,
      compatibility: r.compatibility,
      finalScore: r.finalScore,
      friction: r.friction,
      frictionPenalty: r.frictionPenalty,
      coveragePercent: r.coveragePercent,
      scoreCoverageFactor: r.scoreCoverageFactor,
      coverageFactor: r.coverageFactor,
      confidence: r.confidence,
      infoFlags: r.infoFlags,
      alignments: r.alignments,
      tensions: r.tensions,
      tensionMatrix: r.tensionMatrix,
      policyVersion: RECOMPUTE_POLICY_VERSION,
      derived: r.derived,
      dealbreakers: r.dealbreakers,
      balance: r.balance,
      debug: r.debug,
      explainability: r.explainability,
    };

    await saveMatch(record);
  }

  const avgScoreNew =
    results.length > 0
      ? results.reduce((s, r) => s + r.finalScore, 0) / results.length
      : 0;

  const bins = { '0-19': 0, '20-39': 0, '40-59': 0, '60-69': 0, '70-79': 0, '80-100': 0 };
  for (const r of results) {
    const s = r.finalScore;
    if (s <= 19) bins['0-19']++;
    else if (s <= 39) bins['20-39']++;
    else if (s <= 59) bins['40-59']++;
    else if (s <= 69) bins['60-69']++;
    else if (s <= 79) bins['70-79']++;
    else bins['80-100']++;
  }

  const sortedByScore = [...results].sort((a, b) => b.finalScore - a.finalScore);
  const count100 = results.filter((r) => r.finalScore >= 100).length;
  const count90Plus = results.filter((r) => r.finalScore >= 90).length;
  const P90 = sortedByScore.length ? sortedByScore[Math.min(sortedByScore.length - 1, Math.floor(0.9 * sortedByScore.length))]!.finalScore : 0;
  const P95 = sortedByScore.length ? sortedByScore[Math.min(sortedByScore.length - 1, Math.floor(0.95 * sortedByScore.length))]!.finalScore : 0;
  const P99 = sortedByScore.length ? sortedByScore[Math.min(sortedByScore.length - 1, Math.floor(0.99 * sortedByScore.length))]!.finalScore : 0;

  console.log('');
  console.log('--- Report ---');
  console.log('Total matches:', results.length);
  console.log('Average finalScore:', Math.round(avgScoreNew * 100) / 100);
  console.log('Count of 100s:', count100);
  console.log('Count of 90+:', count90Plus);
  console.log('P90:', P90);
  console.log('P95:', P95);
  console.log('P99:', P99);
  console.log('');
  console.log('Top 5 sample matches (finalScore, rawScore, coverageFactor, friction, tier, dealbreakers):');
  for (let i = 0; i < Math.min(5, sortedByScore.length); i++) {
    const r = sortedByScore[i]!;
    console.log(
      JSON.stringify({
        finalScore: r.finalScore,
        rawScore: r.rawScore,
        coverageFactor: r.coverageFactor,
        friction: r.friction,
        tier: null,
        dealbreakers: r.dealbreakers?.length ? r.dealbreakers.map((d) => d.code ?? d) : [],
      }),
    );
  }
  console.log('');

  console.log(
    JSON.stringify({
      totalMatches: results.length,
      avgFinalScore: Math.round(avgScoreNew * 100) / 100,
      bins,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
