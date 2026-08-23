import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ChildrenUnsureProfileRow } from '../children-unsure/children-unsure-profile-row.types';
import type {
  HolyGrailMatchDiagnosticsDto,
  MatchRecordDto,
} from '../match.types';
import {
  loadMatchPairHgSnapshotMap,
  resolvePairHgFieldsFromSnapshotAndRows,
  upsertMatchPairHgSnapshots,
} from '../compare/match-pair-hg-snapshot';
import { tryPickHolyGrailMatchDiagnosticsDto } from '../holy-grail/holy-grail-match-diagnostics.wire';

@Injectable()
export class MatchesHgDiagnosticsService {
  constructor(private readonly prisma: PrismaService) {}

  async loadSnapshotMap(matchIds: readonly string[]) {
    return loadMatchPairHgSnapshotMap(this.prisma, [...matchIds]);
  }

  /**
   * Legacy hook: pair snapshot table removed (Migration 3). No-op; `written` always 0.
   */
  async persistMatchPairHgSnapshots(
    records: MatchRecordDto[],
  ): Promise<{ written: number; skipped: number }> {
    return upsertMatchPairHgSnapshots(this.prisma, records, new Map());
  }

  /**
   * Same snapshot-primary HG resolution as `list()` (no membership/scoring side effects).
   * Used by secondary list surfaces (e.g. `GET /api/matches`) that do not load full `MatchListItemDto`.
   * Pass `holyGrailRowsById` from `listFullWithHolyGrailRows` to skip an extra profile query.
   */
  async resolveHolyGrailDiagnosticsWireForMatchRecords(
    records: readonly MatchRecordDto[],
    holyGrailRowsById?: ReadonlyMap<string, ChildrenUnsureProfileRow>,
  ): Promise<ReadonlyMap<string, HolyGrailMatchDiagnosticsDto | undefined>> {
    if (records.length === 0) return new Map();
    const snapshotMap = await this.loadSnapshotMap(
      records.map((r) => r.matchId),
    );
    let rowMap: ReadonlyMap<string, ChildrenUnsureProfileRow>;
    if (holyGrailRowsById) {
      rowMap = holyGrailRowsById;
    } else {
      const idSet = new Set<string>();
      for (const r of records) {
        idSet.add(r.aId);
        idSet.add(r.bId);
      }
      // Slice 8: MatchmakingProfile reads disabled; HG row map empty for legacy wire path.
      const rows: ChildrenUnsureProfileRow[] = [];
      rowMap = new Map(
        rows.map((row) => [row.id, row as ChildrenUnsureProfileRow]),
      );
    }
    const out = new Map<string, HolyGrailMatchDiagnosticsDto | undefined>();
    for (const r of records) {
      const { holyGrail } = resolvePairHgFieldsFromSnapshotAndRows({
        matchId: r.matchId,
        snapshot: snapshotMap.get(r.matchId),
        rowA: rowMap.get(r.aId),
        rowB: rowMap.get(r.bId),
      });
      out.set(r.matchId, tryPickHolyGrailMatchDiagnosticsDto(holyGrail));
    }
    return out;
  }
}
