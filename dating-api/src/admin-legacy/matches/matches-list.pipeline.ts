import type { ProfileJsonPayload } from '../../profiles/profiles.types';
import type { ChildrenUnsureProfileRow } from '../../matches/children-unsure-profile-row.types';
import type { MatchListItemDto, MatchRecordDto } from '../../matches/match.types';
import { resolveEngineFinalScore } from '../../matches/match-score.util';
import { compareWithStatus } from '../../matches/match-engine';
import { buildShortReason } from '../../matches/match-short-reason';
import { toCanonicalMatchId } from '../../matches/match-id';
import {
  resolvePairHgFieldsFromSnapshotAndRows,
  type MatchPairHgSnapshotRow,
} from './match-pair-hg-snapshot';
import { tryPickHolyGrailMatchDiagnosticsDto } from './holy-grail-match-diagnostics.wire';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';

/**
 * Computes all pairwise match records from a flat list of profiles.
 * Pure function — no DI, no side effects.
 */
export function buildMatchRecordsFromProfiles(
  profiles: ProfileJsonPayload[],
): MatchRecordDto[] {
  const profileById = new Map(profiles.map((p) => [p.id, p] as const));
  const ids = profiles.map((p) => p.id).sort((a, b) => a.localeCompare(b));
  const records: MatchRecordDto[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const aId = ids[i];
      const bId = ids[j];
      const profileA = profileById.get(aId);
      const profileB = profileById.get(bId);
      if (!profileA || !profileB) continue;
      const result = compareWithStatus(profileA, profileB);
      if (
        'status' in result &&
        (result.status === 'NOT_ANALYZED' ||
          result.status === 'INSUFFICIENT_DATA')
      ) {
        continue;
      }
      const compareResult = result;
      const now = new Date().toISOString();
      records.push({
        matchId: toCanonicalMatchId(aId, bId),
        aId,
        bId,
        a: { id: profileA.id, name: profileA.name },
        b: { id: profileB.id, name: profileB.name },
        createdAt: now,
        updatedAt: now,
        aToB: compareResult.aToB,
        bToA: compareResult.bToA,
        relationshipStyle: compareResult.relationshipStyle,
        coverage: compareResult.coverage,
        frictionRisk: compareResult.frictionRisk,
        compatibility: compareResult.compatibility,
        valuesAlignment: compareResult.valuesAlignment,
        finalScore: compareResult.finalScore,
        rawScore: compareResult.rawScore,
        friction: compareResult.friction,
        frictionPenalty: compareResult.frictionPenalty,
        coveragePercent: compareResult.coveragePercent,
        scoreCoverageFactor: compareResult.scoreCoverageFactor,
        coverageFactor: compareResult.coverageFactor,
        confidence: compareResult.confidence,
        infoFlags: compareResult.infoFlags,
        alignments: compareResult.alignments,
        tensions: compareResult.tensions,
        tensionMatrix: compareResult.tensionMatrix,
        derived: compareResult.derived,
        dealbreakers: compareResult.dealbreakers,
        balance: compareResult.balance,
        debug: compareResult.debug,
        explainability: compareResult.explainability,
        recommendation: compareResult.recommendation,
      });
    }
  }
  return records;
}

/**
 * Maps raw `MatchRecordDto[]` to `MatchListItemDto[]` with HG resolution (empty snapshot map post–Migration 3).
 *
 * Note: caller is responsible for bracketing with
 * `hgPairSnapshotTelemetry.beginListBatch()` / `endListBatch()`.
 * This function calls `recordListPair` once per pair internally.
 */
export function buildMatchListItems(
  records: MatchRecordDto[],
  holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>,
  snapshotMap: ReadonlyMap<string, MatchPairHgSnapshotRow>,
  hgPairSnapshotTelemetry: HolyGrailPairSnapshotTelemetryService,
): MatchListItemDto[] {
  return records.map((r) => {
    const finalScore = resolveEngineFinalScore(r);
    const dealbreakersRaw = r.dealbreakers ?? r.debug?.dealbreakers ?? [];
    const dealbreakers = dealbreakersRaw.map((d) => ({
      code: d.code,
      ...(d.severity != null && { severity: d.severity }),
    }));
    const shortReason = buildShortReason({
      finalScore,
      dealbreakers,
    });
    const scoreMetadata: MatchListItemDto['scoreMetadata'] = {};
    if (r.coveragePercent != null)
      scoreMetadata.coveragePercent = r.coveragePercent;
    if (r.coverageFactor != null)
      scoreMetadata.coverageFactor = r.coverageFactor;
    if (r.friction != null) scoreMetadata.friction = r.friction;
    if (r.rawScore != null) scoreMetadata.rawScore = r.rawScore;

    const rowA = holyGrailRowsById.get(r.aId);
    const rowB = holyGrailRowsById.get(r.bId);
    const { children_unsure, holyGrail, telemetry } =
      resolvePairHgFieldsFromSnapshotAndRows({
        matchId: r.matchId,
        snapshot: snapshotMap.get(r.matchId),
        rowA,
        rowB,
      });
    hgPairSnapshotTelemetry.recordListPair(telemetry);
    const hgWire = tryPickHolyGrailMatchDiagnosticsDto(holyGrail);
    const engineFinalScore = finalScore;
    const rankingScore = engineFinalScore;

    return {
      matchId: r.matchId,
      a: r.a,
      b: r.b,
      finalScore,
      engineFinalScore,
      rankingScore,
      children_unsure,
      updatedAt: r.updatedAt,
      dealbreakers,
      shortReason,
      ...(r.explainability != null && { explainability: r.explainability }),
      ...(r.recommendation != null && { recommendation: r.recommendation }),
      ...(Object.keys(scoreMetadata).length > 0 && { scoreMetadata }),
      ...(hgWire ? { ...hgWire } : {}),
    };
  });
}
