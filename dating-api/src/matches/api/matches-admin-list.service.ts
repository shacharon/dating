import { Injectable } from '@nestjs/common';
import { ProfilesPrismaService } from '../../profiles/profiles-prisma.service';
import { resolveEngineFinalScore } from '../engine/match-score.util';
import type { ChildrenUnsureProfileRow } from '../children-unsure/children-unsure-profile-row.types';
import type { MatchListItemDto, MatchRecordDto } from '../match.types';
import {
  buildMatchListItems,
  buildMatchRecordsFromProfiles,
} from './matches-list.pipeline';
import { HolyGrailPairSnapshotTelemetryService } from '../holy-grail/holy-grail-pair-snapshot-telemetry.service';
import { anyChildrenUnsure, getDisplayScore } from '../children-unsure/children-unsure.helpers';
import {
  filterMatchRecordsByHgListAdmissionGate,
  listItemPassesHgListAdmissionGate,
} from '../holy-grail/hg-list-admission-gate';
import { MatchesFeatureFlagsService } from '../admin/matches-feature-flags.service';
import { MatchesHgDiagnosticsService } from './matches-hg-diagnostics.service';
import type { ListMatchesOptions } from '../matches.service.types';

@Injectable()
export class MatchesAdminListService {
  constructor(
    private readonly profilesPrisma: ProfilesPrismaService,
    private readonly hgPairSnapshotTelemetry: HolyGrailPairSnapshotTelemetryService,
    private readonly featureFlags: MatchesFeatureFlagsService,
    private readonly hgDiagnostics: MatchesHgDiagnosticsService,
  ) {}

  /**
   * Ordered by legacy display score only (`getDisplayScore` → `rankingScore` === `engineFinalScore`).
   * Production contract: `MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1` — HG diagnostics + `children_unsure` never
   * change sort order (`match-ranking-contract.ts`). Optional `ENABLE_HG_LIST_ADMISSION_GATE` drops only rows with a
   * **valid** HG triple and `hgMutualPass === false`; rows without a valid triple stay listed (lenient).
   */
  async list(opts?: ListMatchesOptions): Promise<MatchListItemDto[]> {
    const hideChildrenUnsure = opts?.hideChildrenUnsure === true;
    const { records, holyGrailRowsById } =
      await this.loadPairwiseMatchRecordsAndHolyGrailRows();
    const snapshotMap = await this.hgDiagnostics.loadSnapshotMap(
      records.map((r) => r.matchId),
    );

    this.hgPairSnapshotTelemetry.beginListBatch();
    const mapped = buildMatchListItems(
      records,
      holyGrailRowsById,
      snapshotMap,
      this.hgPairSnapshotTelemetry,
    );

    const gateOn = this.featureFlags.isHgListAdmissionGateEnabled();
    const afterHgGate = gateOn
      ? mapped.filter((row) => listItemPassesHgListAdmissionGate(true, row))
      : mapped;
    const filtered = hideChildrenUnsure
      ? afterHgGate.filter((row) => !anyChildrenUnsure(row.children_unsure))
      : afterHgGate;

    this.hgPairSnapshotTelemetry.endListBatch({
      itemsAfterFilter: filtered.length,
      hideChildrenUnsure,
    });

    return filtered.sort((a, b) => getDisplayScore(b) - getDisplayScore(a));
  }

  async listFull(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<MatchRecordDto[]> {
    return (await this.listFullWithHolyGrailRows(opts)).records;
  }

  /**
   * Filtered legacy records plus the HG row map from the same list load (`loadMatchListProfileData`).
   * Avoids a second `MatchmakingProfile` query when resolving HG wires for the same record set.
   */
  async listFullWithHolyGrailRows(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<{
    readonly records: MatchRecordDto[];
    readonly holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    const { records, holyGrailRowsById } =
      await this.loadPairwiseMatchRecordsAndHolyGrailRows();
    let filtered = records
      .filter((r) => (r.policyVersion ?? '') === opts.policyVersion)
      .filter((r) =>
        opts.minCoveragePercent != null
          ? (r.coveragePercent ?? 0) >= opts.minCoveragePercent
          : true,
      )
      .sort(
        (a, b) =>
          resolveEngineFinalScore(b) - resolveEngineFinalScore(a),
      );
    if (this.featureFlags.isHgListAdmissionGateEnabled()) {
      const snapshotMap = await this.hgDiagnostics.loadSnapshotMap(
        filtered.map((r) => r.matchId),
      );
      filtered = filterMatchRecordsByHgListAdmissionGate({
        gateEnabled: true,
        records: filtered,
        snapshotMap,
        holyGrailRowsById,
      });
    }
    return { records: filtered, holyGrailRowsById };
  }

  async listAllComputed(): Promise<MatchRecordDto[]> {
    const { records } = await this.loadPairwiseMatchRecordsAndHolyGrailRows();
    return records;
  }

  /**
   * Shared match-list load: one profile batch (`loadMatchListProfileData`) → compare records + HG row map.
   */
  private async loadPairwiseMatchRecordsAndHolyGrailRows(): Promise<{
    records: MatchRecordDto[];
    holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    const { profiles, holyGrailRowsById } =
      await this.profilesPrisma.loadMatchListProfileData();
    const records = buildMatchRecordsFromProfiles(profiles);
    return { records, holyGrailRowsById };
  }
}
