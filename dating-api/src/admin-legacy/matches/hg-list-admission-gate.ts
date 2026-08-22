import { tryPickHolyGrailMatchDiagnosticsDto } from './holy-grail-match-diagnostics.wire';
import type { MatchListItemDto, MatchRecordDto } from '../../matches/match.types';
import {
  resolvePairHgFieldsFromSnapshotAndRows,
  type MatchPairHgSnapshotRow,
} from './match-pair-hg-snapshot';
import type { ChildrenUnsureProfileRow } from '../../matches/children-unsure-profile-row.types';

export function parseHgListAdmissionGateEnv(
  configValue: string | undefined,
  processValue: string | undefined,
): boolean {
  const v = (configValue ?? processValue ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * When the gate is on: if the row has **no** valid HG wire triple (`tryPickHolyGrailMatchDiagnosticsDto` → `undefined`),
 * **keep** it (lenient fallback for snapshot / wire lag). If the triple is valid, keep the row only when
 * `hgMutualPass === true`.
 */
export function listItemPassesHgListAdmissionGate(
  gateEnabled: boolean,
  row: MatchListItemDto,
): boolean {
  if (!gateEnabled) return true;
  const w = tryPickHolyGrailMatchDiagnosticsDto(row);
  if (w == null) return true;
  return w.hgMutualPass === true;
}

type SnapshotMap = ReadonlyMap<string, MatchPairHgSnapshotRow | undefined>;

/**
 * Same semantics as {@link listItemPassesHgListAdmissionGate} for raw `MatchRecordDto` + snapshot/rows.
 */
export function matchRecordPassesHgListAdmissionGate(args: {
  readonly gateEnabled: boolean;
  readonly record: MatchRecordDto;
  readonly snapshot: MatchPairHgSnapshotRow | null | undefined;
  readonly rowA: ChildrenUnsureProfileRow | undefined;
  readonly rowB: ChildrenUnsureProfileRow | undefined;
}): boolean {
  if (!args.gateEnabled) return true;
  const { holyGrail } = resolvePairHgFieldsFromSnapshotAndRows({
    matchId: args.record.matchId,
    snapshot: args.snapshot,
    rowA: args.rowA,
    rowB: args.rowB,
  });
  const w = tryPickHolyGrailMatchDiagnosticsDto(holyGrail);
  if (w == null) return true;
  return w.hgMutualPass === true;
}

export function filterMatchRecordsByHgListAdmissionGate(args: {
  readonly gateEnabled: boolean;
  readonly records: readonly MatchRecordDto[];
  readonly snapshotMap: SnapshotMap;
  readonly holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
}): MatchRecordDto[] {
  if (!args.gateEnabled) return [...args.records];
  return args.records.filter((record) =>
    matchRecordPassesHgListAdmissionGate({
      gateEnabled: true,
      record,
      snapshot: args.snapshotMap.get(record.matchId),
      rowA: args.holyGrailRowsById.get(record.aId),
      rowB: args.holyGrailRowsById.get(record.bId),
    }),
  );
}
