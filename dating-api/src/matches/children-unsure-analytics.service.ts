import { Injectable } from '@nestjs/common';

/** In-memory product signals for children_unsure (no DB schema). Resets only on process restart. */
export interface ChildrenUnsureDailySummary {
  readonly dateUtc: string;
  /** Number of GET /api/v1/matches (and getTop) calls that applied list aggregation this day. */
  readonly listAndTopRequests: number;
  /** Sum of match rows returned that had any children_unsure direction true. */
  readonly matchesWithChildrenUnsureCount: number;
  /** Total match rows returned across those responses. */
  readonly totalMatchesReturned: number;
  readonly hideChildrenUnsureFilterInvocations: number;
  readonly badgeImpressionEvents: number;
  readonly badgeClickEvents: number;
}

interface MutableDayBucket {
  listAndTopRequests: number;
  matchesWithChildrenUnsureCount: number;
  totalMatchesReturned: number;
  hideChildrenUnsureFilterInvocations: number;
  badgeImpressionEvents: number;
  badgeClickEvents: number;
}

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ChildrenUnsureAnalyticsService {
  private readonly byDay = new Map<string, MutableDayBucket>();

  private bucketForDate(dateKey: string): MutableDayBucket {
    let b = this.byDay.get(dateKey);
    if (!b) {
      b = {
        listAndTopRequests: 0,
        matchesWithChildrenUnsureCount: 0,
        totalMatchesReturned: 0,
        hideChildrenUnsureFilterInvocations: 0,
        badgeImpressionEvents: 0,
        badgeClickEvents: 0,
      };
      this.byDay.set(dateKey, b);
    }
    return b;
  }

  recordListOrTopResponse(args: {
    readonly returnedCount: number;
    readonly withChildrenUnsureCount: number;
    readonly hideFilterActive: boolean;
  }): void {
    const key = utcDateKey();
    const b = this.bucketForDate(key);
    b.listAndTopRequests += 1;
    b.totalMatchesReturned += args.returnedCount;
    b.matchesWithChildrenUnsureCount += args.withChildrenUnsureCount;
    if (args.hideFilterActive) {
      b.hideChildrenUnsureFilterInvocations += 1;
    }
  }

  recordBadgeImpression(): void {
    const b = this.bucketForDate(utcDateKey());
    b.badgeImpressionEvents += 1;
  }

  recordBadgeClick(): void {
    const b = this.bucketForDate(utcDateKey());
    b.badgeClickEvents += 1;
  }

  getDailySummary(dateUtc?: string): ChildrenUnsureDailySummary {
    const date = dateUtc ?? utcDateKey();
    const b = this.bucketForDate(date);
    return {
      dateUtc: date,
      listAndTopRequests: b.listAndTopRequests,
      matchesWithChildrenUnsureCount: b.matchesWithChildrenUnsureCount,
      totalMatchesReturned: b.totalMatchesReturned,
      hideChildrenUnsureFilterInvocations:
        b.hideChildrenUnsureFilterInvocations,
      badgeImpressionEvents: b.badgeImpressionEvents,
      badgeClickEvents: b.badgeClickEvents,
    };
  }
}
