import { BadRequestException } from '@nestjs/common';
import type { MatchQualityCompareQueryDto } from './dto/match-quality-compare-query.dto';
import type { MatchQualityPeriodSummaryDto } from './dto/match-quality-compare.dto';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MAX_COMPARE_WINDOW_DAYS = 90;

export type CompareWindowBounds = {
  before: { start: Date; end: Date };
  after: { start: Date; end: Date };
};

export function computeWindowStart(windowDays: number): Date {
  return new Date(Date.now() - windowDays * MS_PER_DAY);
}

export function computePositiveRate(
  feedbackCount: number,
  positiveCount: number,
): number | null {
  if (feedbackCount === 0) {
    return null;
  }
  return positiveCount / feedbackCount;
}

export function computeCompareDeltas(
  before: Pick<MatchQualityPeriodSummaryDto, 'positiveRate' | 'feedbackCount'>,
  after: Pick<MatchQualityPeriodSummaryDto, 'positiveRate' | 'feedbackCount'>,
): { positiveRateDelta: number | null; feedbackCountDelta: number } {
  return {
    positiveRateDelta:
      before.positiveRate === null || after.positiveRate === null
        ? null
        : after.positiveRate - before.positiveRate,
    feedbackCountDelta: after.feedbackCount - before.feedbackCount,
  };
}

function hasIsoFields(query: MatchQualityCompareQueryDto): boolean {
  return (
    query.beforeStart != null ||
    query.beforeEnd != null ||
    query.afterStart != null ||
    query.afterEnd != null
  );
}

function hasShorthandFields(query: MatchQualityCompareQueryDto): boolean {
  return query.beforeDays != null || query.afterDays != null;
}

export function validateCompareQueryMode(
  query: MatchQualityCompareQueryDto,
): { ok: true } | { ok: false; error: string } {
  const iso = hasIsoFields(query);
  const shorthand = hasShorthandFields(query);

  if (!iso && !shorthand) {
    return { ok: false, error: 'compare_window_required' };
  }

  if (iso && shorthand) {
    return { ok: false, error: 'compare_window_required' };
  }

  if (shorthand) {
    if (query.beforeDays == null || query.afterDays == null) {
      return { ok: false, error: 'compare_window_required' };
    }
    return { ok: true };
  }

  if (
    query.beforeStart == null ||
    query.beforeEnd == null ||
    query.afterStart == null ||
    query.afterEnd == null
  ) {
    return { ok: false, error: 'compare_window_required' };
  }

  return { ok: true };
}

function windowSpanDays(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_PER_DAY;
}

function assertWindowValid(start: Date, end: Date): void {
  if (start.getTime() >= end.getTime()) {
    throw new BadRequestException({ error: 'compare_window_invalid' });
  }
  if (windowSpanDays(start, end) > MAX_COMPARE_WINDOW_DAYS) {
    throw new BadRequestException({ error: 'compare_window_too_long' });
  }
}

export function resolveCompareWindows(
  query: MatchQualityCompareQueryDto,
): CompareWindowBounds {
  const mode = validateCompareQueryMode(query);
  if (!mode.ok) {
    throw new BadRequestException({ error: mode.error });
  }

  if (query.beforeDays != null && query.afterDays != null) {
    const now = Date.now();
    const afterEnd = new Date(now);
    const afterStart = new Date(now - query.afterDays * MS_PER_DAY);
    const beforeEnd = afterStart;
    const beforeStart = new Date(
      now - (query.afterDays + query.beforeDays) * MS_PER_DAY,
    );

    assertWindowValid(beforeStart, beforeEnd);
    assertWindowValid(afterStart, afterEnd);

    return {
      before: { start: beforeStart, end: beforeEnd },
      after: { start: afterStart, end: afterEnd },
    };
  }

  const beforeStart = new Date(query.beforeStart!);
  const beforeEnd = new Date(query.beforeEnd!);
  const afterStart = new Date(query.afterStart!);
  const afterEnd = new Date(query.afterEnd!);

  assertWindowValid(beforeStart, beforeEnd);
  assertWindowValid(afterStart, afterEnd);

  if (beforeEnd.getTime() > afterStart.getTime()) {
    throw new BadRequestException({ error: 'compare_windows_overlap' });
  }

  return {
    before: { start: beforeStart, end: beforeEnd },
    after: { start: afterStart, end: afterEnd },
  };
}
