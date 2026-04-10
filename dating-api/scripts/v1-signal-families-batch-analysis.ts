/**
 * Production-like batch: v1 free-text signal families (personalityTraits, lifestyleSignals, interestTags).
 *
 * - Corpus coverage, per-tag counts, self vs partner, unmapped rates (text present but no tags for family).
 * - 20 searchers × fixed candidate pool: top-5 rank order before vs after stripping v1 tag fields from rankingSignals.
 *
 * Requires DATABASE_URL and applied Prisma migrations (HG ranking columns on `ProfileSignalSnapshot`).
 * Run from dating-api:
 *   npx ts-node scripts/v1-signal-families-batch-analysis.ts
 *
 * Optional env:
 *   V1_BATCH_POOL_SIZE=100   (max candidates per searcher, default 100)
 *   V1_BATCH_OUTPUT=json path (default scripts/.v1-signal-families-batch-output.json)
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { MatchingCanonicalModel, MatchingRankingSignalsSnapshot } from '../src/canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from '../src/holy-grail-matching/holy-grail-five-signal-ranking';
import { extractInterestTagsV1FromFreeText } from '../src/holy-grail-matching/interest-tags-text.extract';
import { extractLifestyleSignalsFromFreeText } from '../src/holy-grail-matching/lifestyle-signals-text.extract';
import { extractPersonalityTraitsFromFreeText } from '../src/holy-grail-matching/personality-traits-text.extract';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import {
  buildHolyGrailProfileMappingInputFromRankingAwareDbRow,
  type HolyGrailRankingAwareDbRow,
} from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { CHILDREN_UNSURE_PROFILE_ROW_SELECT } from '../src/matches/match-detail-children-unsure';
import type { ChildrenUnsureProfileRow } from '../src/matches/children-unsure-profile-row.types';

const POOL_SIZE = Math.max(20, parseInt(process.env.V1_BATCH_POOL_SIZE ?? '100', 10) || 100);
const OUTPUT_JSON = process.env.V1_BATCH_OUTPUT ?? path.join(__dirname, '.v1-signal-families-batch-output.json');
const SEARCHER_COUNT = 20;
const TOP_K = 5;

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((1e4 * n) / d) / 100;
}

function bump(m: Map<string, number>, k: string, n = 1): void {
  m.set(k, (m.get(k) ?? 0) + n);
}

function stripV1TagFamilies(rs: MatchingRankingSignalsSnapshot | undefined): MatchingRankingSignalsSnapshot {
  const base = rs
    ? { ...rs }
    : {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: null,
        lifestylePace: null,
        interestsTop: [],
      };
  const loose = base as unknown as Record<string, unknown>;
  delete loose.personalityTraitsSelf;
  delete loose.personalityTraitsPartner;
  delete loose.lifestyleSignalsSelf;
  delete loose.lifestyleSignalsPartner;
  delete loose.interestTagsSelf;
  delete loose.interestTagsPartner;
  return base;
}

function stripV1FromModel(m: MatchingCanonicalModel): MatchingCanonicalModel {
  return {
    ...m,
    rankingSignals: stripV1TagFamilies(m.rankingSignals),
  };
}

function rowToCanonical(row: ChildrenUnsureProfileRow): MatchingCanonicalModel {
  return mapProfileSourceToMatchingCanonical(
    buildHolyGrailProfileMappingInputFromRankingAwareDbRow(row as unknown as HolyGrailRankingAwareDbRow),
  );
}

function rankTopK(
  searcher: MatchingCanonicalModel,
  candidates: MatchingCanonicalModel[],
  k: number,
): { ids: string[]; scores: Record<string, number> } {
  const scored = candidates.map((c) => ({
    id: c.profileId,
    score: computeHolyGrailFiveSignalRank({ searcher, candidate: c }).rankScore,
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
  const top = scored.slice(0, Math.min(k, scored.length));
  const scores: Record<string, number> = {};
  for (const s of scored) scores[s.id] = s.score;
  return { ids: top.map((x) => x.id), scores };
}

function main(): void {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') {
    throw new Error('DATABASE_URL is not set');
  }

  const prisma = new PrismaClient();
  void (async () => {
    const rows = (await prisma.userProfile.findMany({
      select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
      orderBy: { id: 'asc' },
    })) as ChildrenUnsureProfileRow[];

    const n = rows.length;
    if (n < SEARCHER_COUNT + TOP_K + 1) {
      throw new Error(
        `Need at least ${SEARCHER_COUNT + TOP_K + 1} profiles for analysis (have ${n}). Seed or point DATABASE_URL at a larger DB.`,
      );
    }

    let anyBio = 0;
    let selfTextScopes = 0;
    let partnerTextScopes = 0;

    const hasPersonality = new Set<string>();
    const hasLifestyle = new Set<string>();
    const hasInterest = new Set<string>();

    const bioNoPersonality = new Set<string>();
    const bioNoLifestyle = new Set<string>();
    const bioNoInterest = new Set<string>();

    const persTagsSelf = new Map<string, number>();
    const persTagsPartner = new Map<string, number>();
    const lifeTagsSelf = new Map<string, number>();
    const lifeTagsPartner = new Map<string, number>();
    const intTagsSelf = new Map<string, number>();
    const intTagsPartner = new Map<string, number>();

    let persScopeUnmappedSelf = 0;
    let persScopeUnmappedPartner = 0;
    let lifeScopeUnmappedSelf = 0;
    let lifeScopeUnmappedPartner = 0;
    let intScopeUnmappedSelf = 0;
    let intScopeUnmappedPartner = 0;

    for (const r of rows) {
      const me = typeof r.aboutMe === 'string' ? r.aboutMe : '';
      const pr = typeof r.aboutPartner === 'string' ? r.aboutPartner : r.aboutPartner ?? '';
      if (me.trim().length > 0 || pr.trim().length > 0) {
        anyBio += 1;
        bioNoPersonality.add(r.id);
        bioNoLifestyle.add(r.id);
        bioNoInterest.add(r.id);
      }

      const pt = extractPersonalityTraitsFromFreeText({ aboutMe: me, aboutPartner: pr });
      const ls = extractLifestyleSignalsFromFreeText({ aboutMe: me, aboutPartner: pr });
      const it = extractInterestTagsV1FromFreeText({ aboutMe: me, aboutPartner: pr });

      if (me.trim().length > 0) {
        selfTextScopes += 1;
        if (pt.self.tags.length === 0) persScopeUnmappedSelf += 1;
        if (ls.self.tags.length === 0) lifeScopeUnmappedSelf += 1;
        if (it.self.tags.length === 0) intScopeUnmappedSelf += 1;
      }
      if (pr.trim().length > 0) {
        partnerTextScopes += 1;
        if (pt.partner.tags.length === 0) persScopeUnmappedPartner += 1;
        if (ls.partner.tags.length === 0) lifeScopeUnmappedPartner += 1;
        if (it.partner.tags.length === 0) intScopeUnmappedPartner += 1;
      }

      if (pt.self.tags.length + pt.partner.tags.length > 0) {
        hasPersonality.add(r.id);
        bioNoPersonality.delete(r.id);
      }
      if (ls.self.tags.length + ls.partner.tags.length > 0) {
        hasLifestyle.add(r.id);
        bioNoLifestyle.delete(r.id);
      }
      if (it.self.tags.length + it.partner.tags.length > 0) {
        hasInterest.add(r.id);
        bioNoInterest.delete(r.id);
      }

      for (const t of pt.self.tags) bump(persTagsSelf, t);
      for (const t of pt.partner.tags) bump(persTagsPartner, t);
      for (const t of ls.self.tags) bump(lifeTagsSelf, t);
      for (const t of ls.partner.tags) bump(lifeTagsPartner, t);
      for (const t of it.self.tags) bump(intTagsSelf, t);
      for (const t of it.partner.tags) bump(intTagsPartner, t);
    }

    const coverageTable = {
      totalProfiles: n,
      profilesWithAnyBioText: anyBio,
      pctAtLeastOneTag_personalityTraits: pct(hasPersonality.size, n),
      pctAtLeastOneTag_lifestyleSignals: pct(hasLifestyle.size, n),
      pctAtLeastOneTag_interestTags: pct(hasInterest.size, n),
      pctAtLeastOneTag_anyFamily: pct(
        [...rows].filter((r) => hasPersonality.has(r.id) || hasLifestyle.has(r.id) || hasInterest.has(r.id)).length,
        n,
      ),
    };

    const unmapped = {
      /** Profile has some bio text but zero tags for that family (either scope). */
      profileLevel_pctNoPersonalityAmongBio: pct(bioNoPersonality.size, anyBio),
      profileLevel_pctNoLifestyleAmongBio: pct(bioNoLifestyle.size, anyBio),
      profileLevel_pctNoInterestAmongBio: pct(bioNoInterest.size, anyBio),
      /** Scope-level: non-empty field but extractor returned no tags for that scope. */
      selfScope_pctUnmapped_personality: pct(persScopeUnmappedSelf, selfTextScopes),
      selfScope_pctUnmapped_lifestyle: pct(lifeScopeUnmappedSelf, selfTextScopes),
      selfScope_pctUnmapped_interest: pct(intScopeUnmappedSelf, selfTextScopes),
      partnerScope_pctUnmapped_personality: pct(persScopeUnmappedPartner, partnerTextScopes),
      partnerScope_pctUnmapped_lifestyle: pct(lifeScopeUnmappedPartner, partnerTextScopes),
      partnerScope_pctUnmapped_interest: pct(intScopeUnmappedPartner, partnerTextScopes),
    };

    const tagDistribution = {
      personalityTraits: {
        self: Object.fromEntries([...persTagsSelf.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
        partner: Object.fromEntries([...persTagsPartner.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      },
      lifestyleSignals: {
        self: Object.fromEntries([...lifeTagsSelf.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
        partner: Object.fromEntries([...lifeTagsPartner.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      },
      interestTags: {
        self: Object.fromEntries([...intTagsSelf.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
        partner: Object.fromEntries([...intTagsPartner.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      },
    };

    const substantial = rows.filter((r) => {
      const me = (r.aboutMe ?? '').trim();
      const pr = (r.aboutPartner ?? '').trim();
      return me.length + pr.length >= 20;
    });
    const searcherRows = substantial.slice(0, SEARCHER_COUNT);
    const searcherIds = new Set(searcherRows.map((r) => r.id));
    const poolRows = rows.filter((r) => !searcherIds.has(r.id)).slice(0, POOL_SIZE);

    const poolCanonical = poolRows.map(rowToCanonical);
    const searcherCanonicals = searcherRows.map((sr) => ({ row: sr, canonical: rowToCanonical(sr) }));

    const rankingComparisons: {
      searcherId: string;
      top5Before: string[];
      top5After: string[];
      identicalOrdered: boolean;
      sameSet: boolean;
      jaccardTop5: number;
      rank1ScoreBefore: number | null;
      rank1ScoreAfter: number | null;
      rank1IdBefore: string | null;
      rank1IdAfter: string | null;
    }[] = [];

    let orderedChanged = 0;
    let setChanged = 0;
    let rank1Changed = 0;

    for (const { row, canonical: sFull } of searcherCanonicals) {
      const sBefore = stripV1FromModel(sFull);
      const poolBefore = poolCanonical.map(stripV1FromModel);

      const after = rankTopK(sFull, poolCanonical, TOP_K);
      const before = rankTopK(sBefore, poolBefore, TOP_K);

      const setA = new Set(after.ids);
      const setB = new Set(before.ids);
      let inter = 0;
      for (const x of setA) if (setB.has(x)) inter += 1;
      const union = new Set([...setA, ...setB]).size;
      const jacc = union > 0 ? inter / union : 1;

      const identicalOrdered =
        after.ids.length === before.ids.length && after.ids.every((id, i) => id === before.ids[i]);
      const sameSet = setA.size === setB.size && inter === setA.size;

      if (!identicalOrdered) orderedChanged += 1;
      if (!sameSet) setChanged += 1;

      const r1b = before.ids[0] ?? null;
      const r1a = after.ids[0] ?? null;
      if (r1b !== r1a) rank1Changed += 1;

      rankingComparisons.push({
        searcherId: row.id,
        top5Before: before.ids,
        top5After: after.ids,
        identicalOrdered: identicalOrdered,
        sameSet,
        jaccardTop5: Math.round(1e4 * jacc) / 1e4,
        rank1ScoreBefore: r1b ? before.scores[r1b] ?? null : null,
        rank1ScoreAfter: r1a ? after.scores[r1a] ?? null : null,
        rank1IdBefore: r1b,
        rank1IdAfter: r1a,
      });
    }

    const out = {
      generatedAt: new Date().toISOString(),
      rankingSignalMode: 'full_hg_columns' as const,
      poolSize: poolRows.length,
      searcherCount: searcherRows.length,
      coverageTable,
      tagDistribution,
      unmapped,
      selfVsPartnerNote:
        'Tag counts are occurrences per scope (one profile can contribute to both self and partner columns).',
      ranking: {
        orderedTop5Changed_count: orderedChanged,
        orderedTop5Changed_pctOfSearchers: pct(orderedChanged, searcherRows.length),
        top5SetChanged_count: setChanged,
        top5SetChanged_pctOfSearchers: pct(setChanged, searcherRows.length),
        rank1CandidateChanged_count: rank1Changed,
        rank1CandidateChanged_pctOfSearchers: pct(rank1Changed, searcherRows.length),
        comparisons: rankingComparisons,
      },
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(out, null, 2), 'utf8');

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(out, null, 2));

    await prisma.$disconnect();
  })().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    void prisma.$disconnect();
    process.exitCode = 1;
  });
}

main();
