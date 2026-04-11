import { Injectable } from '@nestjs/common';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { HgPairResolutionTelemetry } from './match-pair-hg-snapshot';

export interface HgPairSnapshotListBatchStats {
  readonly pairs: number;
  readonly childrenSnapshot: number;
  readonly childrenLive: number;
  readonly childrenDefault: number;
  readonly diagnosticsSnapshot: number;
  readonly diagnosticsLive: number;
  readonly diagnosticsNone: number;
  readonly liveEvalRuns: number;
  readonly liveEvalReturnedNull: number;
  /** Both `children_unsure` and HG diagnostics taken from snapshot; no live HG eval. */
  readonly snapshotFullPairHits: number;
  /** Live HG ran but at least one slice still came from snapshot (partial reuse). */
  readonly snapshotAssistedLiveFallbackHits: number;
  /** Counts by `classifyChildrenUnsureFromSnapshot` reject reason (when reject occurred). */
  readonly invalidSnapshotChildrenRejectCounts: Readonly<Record<string, number>>;
  /** Counts by `classifyHolyGrailDiagnosticsFromSnapshot` reject reason. */
  readonly invalidSnapshotDiagnosticsRejectCounts: Readonly<Record<string, number>>;
  /** `snapshotFullPairHits / pairs` (0 if no pairs). */
  readonly snapshotFullPairHitRate: number;
  /** `liveEvalRuns / pairs` — share of pairs that ran live HG fallback. */
  readonly liveFallbackRate: number;
}

export interface HgPairSnapshotCumulativeStats extends HgPairSnapshotListBatchStats {
  readonly listRequests: number;
  readonly detailResolutions: number;
}

/** Internal counters (mutated); exposed as readonly via `getCumulative` / batch spread. */
type MutableListBatch = {
  pairs: number;
  childrenSnapshot: number;
  childrenLive: number;
  childrenDefault: number;
  diagnosticsSnapshot: number;
  diagnosticsLive: number;
  diagnosticsNone: number;
  liveEvalRuns: number;
  liveEvalReturnedNull: number;
  snapshotFullPairHits: number;
  snapshotAssistedLiveFallbackHits: number;
  invalidSnapshotChildrenRejectCounts: Record<string, number>;
  invalidSnapshotDiagnosticsRejectCounts: Record<string, number>;
};

type MutableCumulative = MutableListBatch & {
  listRequests: number;
  detailResolutions: number;
};

const emptyBatch = (): MutableListBatch => ({
  pairs: 0,
  childrenSnapshot: 0,
  childrenLive: 0,
  childrenDefault: 0,
  diagnosticsSnapshot: 0,
  diagnosticsLive: 0,
  diagnosticsNone: 0,
  liveEvalRuns: 0,
  liveEvalReturnedNull: 0,
  snapshotFullPairHits: 0,
  snapshotAssistedLiveFallbackHits: 0,
  invalidSnapshotChildrenRejectCounts: {},
  invalidSnapshotDiagnosticsRejectCounts: {},
});

const emptyCumulative = (): MutableCumulative => ({
  ...emptyBatch(),
  listRequests: 0,
  detailResolutions: 0,
});

function bumpReject(map: Record<string, number>, key: string | undefined): void {
  if (key === undefined || key === '') return;
  map[key] = (map[key] ?? 0) + 1;
}

function freezeCountMap(m: Record<string, number>): Readonly<Record<string, number>> {
  return Object.freeze({ ...m });
}

function batchToReadonlyStats(
  b: MutableListBatch,
  rates: { snapshotFullPairHitRate: number; liveFallbackRate: number },
): HgPairSnapshotListBatchStats {
  return {
    pairs: b.pairs,
    childrenSnapshot: b.childrenSnapshot,
    childrenLive: b.childrenLive,
    childrenDefault: b.childrenDefault,
    diagnosticsSnapshot: b.diagnosticsSnapshot,
    diagnosticsLive: b.diagnosticsLive,
    diagnosticsNone: b.diagnosticsNone,
    liveEvalRuns: b.liveEvalRuns,
    liveEvalReturnedNull: b.liveEvalReturnedNull,
    snapshotFullPairHits: b.snapshotFullPairHits,
    snapshotAssistedLiveFallbackHits: b.snapshotAssistedLiveFallbackHits,
    invalidSnapshotChildrenRejectCounts: freezeCountMap(b.invalidSnapshotChildrenRejectCounts),
    invalidSnapshotDiagnosticsRejectCounts: freezeCountMap(b.invalidSnapshotDiagnosticsRejectCounts),
    snapshotFullPairHitRate: rates.snapshotFullPairHitRate,
    liveFallbackRate: rates.liveFallbackRate,
  };
}

function applyTelemetryToBatch(b: MutableListBatch, t: HgPairResolutionTelemetry): void {
  b.pairs += 1;
  if (t.childrenSource === 'snapshot') b.childrenSnapshot += 1;
  else if (t.childrenSource === 'live') b.childrenLive += 1;
  else b.childrenDefault += 1;
  if (t.diagnosticsSource === 'snapshot') b.diagnosticsSnapshot += 1;
  else if (t.diagnosticsSource === 'live') b.diagnosticsLive += 1;
  else b.diagnosticsNone += 1;
  if (t.liveEvalRan) b.liveEvalRuns += 1;
  if (t.liveEvalReturnedNull) b.liveEvalReturnedNull += 1;

  bumpReject(b.invalidSnapshotChildrenRejectCounts, t.snapshotChildrenReject);
  bumpReject(b.invalidSnapshotDiagnosticsRejectCounts, t.snapshotDiagnosticsReject);

  const childrenSnap = t.childrenSource === 'snapshot';
  const diagSnap = t.diagnosticsSource === 'snapshot';
  if (!t.liveEvalRan && childrenSnap && diagSnap) {
    b.snapshotFullPairHits += 1;
  }
  if (t.liveEvalRan && (childrenSnap || diagSnap)) {
    b.snapshotAssistedLiveFallbackHits += 1;
  }
}

@Injectable()
export class HolyGrailPairSnapshotTelemetryService {
  private cumulative: MutableCumulative = emptyCumulative();
  private listBatch: MutableListBatch | null = null;
  private lastListBatch: (HgPairSnapshotListBatchStats & {
    itemsAfterFilter: number;
    hideChildrenUnsure: boolean;
  }) | null = null;

  constructor(private readonly logger: SimpleLogger) {}

  /** Call before building list rows (pairs loop). */
  beginListBatch(): void {
    this.listBatch = emptyBatch();
  }

  /** Aggregate one pair resolution (list path). */
  recordListPair(t: HgPairResolutionTelemetry): void {
    applyTelemetryToBatch(this.cumulative, t);
    if (this.listBatch) {
      applyTelemetryToBatch(this.listBatch, t);
    }
  }

  /**
   * Log batch summary + store `lastListBatch` for GET summary. Does not reset cumulative counters.
   */
  endListBatch(context: {
    itemsAfterFilter: number;
    hideChildrenUnsure: boolean;
  }): void {
    const batch = this.listBatch;
    this.listBatch = null;
    this.cumulative.listRequests += 1;
    if (!batch) {
      return;
    }
    const p = batch.pairs;
    const rates = {
      snapshotFullPairHitRate: p > 0 ? batch.snapshotFullPairHits / p : 0,
      liveFallbackRate: p > 0 ? batch.liveEvalRuns / p : 0,
    };
    const readonlyBatch = batchToReadonlyStats(batch, rates);
    this.lastListBatch = { ...readonlyBatch, ...context };
    this.logger.log(
      JSON.stringify({
        event: 'hg_pair_snapshot_list_batch',
        batch: readonlyBatch,
        context,
        cumulativePairs: this.cumulative.pairs,
      }),
      'HgPairSnapshotTelemetry',
    );
  }

  /** Detail GET: one pair + structured log line (counts toward cumulative only). */
  recordDetailResolution(t: HgPairResolutionTelemetry): void {
    applyTelemetryToBatch(this.cumulative, t);
    this.cumulative.detailResolutions += 1;
    const p = this.cumulative.pairs;
    this.logger.log(
      JSON.stringify({
        event: 'hg_pair_snapshot_detail',
        telemetry: t,
        cumulativeRates: {
          snapshotFullPairHitRate: p > 0 ? this.cumulative.snapshotFullPairHits / p : 0,
          liveFallbackRate: p > 0 ? this.cumulative.liveEvalRuns / p : 0,
        },
        cumulativeInvalidChildrenRejectCounts: freezeCountMap(this.cumulative.invalidSnapshotChildrenRejectCounts),
        cumulativeInvalidDiagnosticsRejectCounts: freezeCountMap(
          this.cumulative.invalidSnapshotDiagnosticsRejectCounts,
        ),
      }),
      'HgPairSnapshotTelemetry',
    );
  }

  getCumulative(): Readonly<HgPairSnapshotCumulativeStats> {
    const p = this.cumulative.pairs;
    const base = batchToReadonlyStats(this.cumulative, {
      snapshotFullPairHitRate: p > 0 ? this.cumulative.snapshotFullPairHits / p : 0,
      liveFallbackRate: p > 0 ? this.cumulative.liveEvalRuns / p : 0,
    });
    return {
      ...base,
      listRequests: this.cumulative.listRequests,
      detailResolutions: this.cumulative.detailResolutions,
    };
  }

  getLastListBatch(): Readonly<
    HgPairSnapshotListBatchStats & { itemsAfterFilter: number; hideChildrenUnsure: boolean }
  > | null {
    return this.lastListBatch ? { ...this.lastListBatch } : null;
  }
}
