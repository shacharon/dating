import { Injectable } from '@nestjs/common';
import type { ChildrenUnsureProfileRow } from './children-unsure/children-unsure-profile-row.types';
import type {
  HolyGrailMatchDiagnosticsDto,
  MatchListItemDto,
  MatchRecordDto,
} from './match.types';
import { computeShadowHgVsLegacyMetricsFromListItems } from './compare/shadow-hg-vs-legacy-metrics';
import type { ShadowHgVsLegacyMetricsReport } from './compare/shadow-hg-vs-legacy-metrics';
import { MatchesCompareService } from './admin/matches-compare.service';
import { MatchesFeatureFlagsService } from './admin/matches-feature-flags.service';
import { MatchesAdminListService } from './api/matches-admin-list.service';
import { MatchesHgDiagnosticsService } from './api/matches-hg-diagnostics.service';
import type {
  CompareBodyDto,
  CompareHgDiagnosticResult,
  CompareServiceResult,
  ListMatchesOptions,
} from './matches.service.types';

export type { CompareResultDto } from './engine/match-engine';
export type { MatchListItemDto } from './match.types';

export {
  MATCH_RANKING_CONTRACT,
  type MatchRankingContractId,
} from './recommendation/match-ranking-contract';
export { ENABLE_HG_LIST_ADMISSION_GATE_ENV } from './holy-grail/hg-list-admission-gate.constants';
export type { ShadowHgVsLegacyMetricsReport } from './compare/shadow-hg-vs-legacy-metrics';

export type {
  CompareBodyDto,
  CompareGuardMatchDto,
  CompareHgDiagnosticFailure,
  CompareHgDiagnosticResult,
  CompareHgDiagnosticSuccess,
  CompareServiceResult,
  ListMatchesOptions,
} from './matches.service.types';

@Injectable()
export class MatchesService {
  constructor(
    private readonly compareService: MatchesCompareService,
    private readonly adminListService: MatchesAdminListService,
    private readonly hgDiagnosticsService: MatchesHgDiagnosticsService,
    private readonly featureFlags: MatchesFeatureFlagsService,
  ) {}

  isHgCompareDiagnosticEnabled(): boolean {
    return this.featureFlags.isHgCompareDiagnosticEnabled();
  }

  isHgListAdmissionGateEnabled(): boolean {
    return this.featureFlags.isHgListAdmissionGateEnabled();
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  compareHgDiagnostic(body: CompareBodyDto): Promise<CompareHgDiagnosticResult> {
    return this.compareService.compareHgDiagnostic(body);
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  getReadyMatchDetailContext(matchId: string): Promise<{
    readonly match: MatchRecordDto;
    readonly rowA: ChildrenUnsureProfileRow;
    readonly rowB: ChildrenUnsureProfileRow;
  } | null> {
    return this.compareService.getReadyMatchDetailContext(matchId);
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  compare(body: CompareBodyDto): Promise<CompareServiceResult> {
    return this.compareService.compare(body);
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  persistMatchPairHgSnapshots(
    records: MatchRecordDto[],
  ): Promise<{ written: number; skipped: number }> {
    return this.hgDiagnosticsService.persistMatchPairHgSnapshots(records);
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  list(opts?: ListMatchesOptions): Promise<MatchListItemDto[]> {
    return this.adminListService.list(opts);
  }

  /**
   * Shadow cutover metrics: same runtime path as `list({ hideChildrenUnsure: false })`, read-only aggregates.
   * @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches).
   */
  async getShadowHgVsLegacyMetrics(): Promise<ShadowHgVsLegacyMetricsReport> {
    const items = await this.adminListService.list({ hideChildrenUnsure: false });
    return computeShadowHgVsLegacyMetricsFromListItems(items);
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  listFull(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<MatchRecordDto[]> {
    return this.adminListService.listFull(opts);
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  listFullWithHolyGrailRows(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<{
    readonly records: MatchRecordDto[];
    readonly holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    return this.adminListService.listFullWithHolyGrailRows(opts);
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  resolveHolyGrailDiagnosticsWireForMatchRecords(
    records: readonly MatchRecordDto[],
    holyGrailRowsById?: ReadonlyMap<string, ChildrenUnsureProfileRow>,
  ): Promise<ReadonlyMap<string, HolyGrailMatchDiagnosticsDto | undefined>> {
    return this.hgDiagnosticsService.resolveHolyGrailDiagnosticsWireForMatchRecords(
      records,
      holyGrailRowsById,
    );
  }

  /** @deprecated Admin/legacy stack — product list uses MeMatchesService (/api/v1/me/matches). */
  listAllComputed(): Promise<MatchRecordDto[]> {
    return this.adminListService.listAllComputed();
  }
}
