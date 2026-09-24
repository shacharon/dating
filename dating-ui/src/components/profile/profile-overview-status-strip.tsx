'use client';

import Link from 'next/link';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import {
  formatOverviewTemplate,
  overviewLocationLine,
  overviewPartnerLine,
  overviewPhotoStripSummary,
  overviewStoryWordCount,
} from '@/components/profile/profile-overview-display';
import type { MeLatestAnalysisDto } from '@/lib/api/me-analysis-api';
import type { MeProfilePhotoDto } from '@/lib/api/me-photos-api';
import type { ProfileQualityDto } from '@/lib/api/profile-quality-api';
import { useAppLocale } from '@/lib/i18n';
import {
  PROFILE_HREF,
  profileEditHash,
} from '@/lib/profile/profile-hub-paths';
import { mapEvaluationToViewModel } from '@/lib/matches/analysis-presentation';

type Props = {
  draft: ProfileDraft;
  photos: MeProfilePhotoDto[];
  quality: ProfileQualityDto | null;
  qualityLoading: boolean;
  qualityFailed: boolean;
  analysis: MeLatestAnalysisDto | null;
};

const linkClass =
  'flex min-h-11 min-w-[8.5rem] flex-1 flex-col justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-start transition-colors hover:border-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:focus-visible:outline-zinc-100';

/**
 * Compact status strip: quality % + four deep links into Story 7 routes.
 */
export function ProfileOverviewStatusStrip({
  draft,
  photos,
  quality,
  qualityLoading,
  qualityFailed,
  analysis,
}: Props) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;

  const words = overviewStoryWordCount(draft);
  const analyzed = Boolean(analysis?.evaluationId && analysis.evaluationJson);
  const photoSummary = overviewPhotoStripSummary(photos);
  const partner = overviewPartnerLine(
    draft.desiredPartnerGenders,
    copy.gender,
  );
  const location = overviewLocationLine(draft);

  let analysisDetail = hub.overviewStripNotRun;
  if (analyzed && analysis?.evaluationJson) {
    const vm = mapEvaluationToViewModel(analysis.evaluationJson);
    const top =
      vm.selfHighlights[0] ?? vm.partnerHighlights[0] ?? null;
    if (top) analysisDetail = top;
  }

  const matchingDetail =
    [partner, location].filter(Boolean).join(' · ') ||
    hub.overviewStripMatchingEmpty;

  let photoDetail = hub.overviewStripPhotosNone;
  if (photoSummary.filled > 0) {
    const count = formatOverviewTemplate(hub.overviewStripPhotosCount, {
      filled: photoSummary.filled,
      max: photoSummary.max,
    });
    const review =
      photoSummary.review === 'pending'
        ? hub.overviewStripPhotosPending
        : photoSummary.review === 'approved'
          ? hub.overviewStripPhotosApproved
          : null;
    photoDetail = review ? `${count} · ${review}` : count;
  }

  const storyDetail = [
    formatOverviewTemplate(hub.overviewStripWords, { count: words }),
    analyzed ? hub.overviewStripAnalyzed : hub.overviewStripNotAnalyzed,
  ].join(' · ');

  return (
    <div
      className="space-y-3"
      data-testid="profile-overview-status-strip"
    >
      <div className="flex items-baseline gap-2">
        {qualityLoading ? (
          <span
            className="text-sm text-zinc-500 dark:text-zinc-400"
            role="status"
            data-testid="profile-overview-score"
          >
            {hub.overviewStripScoreLoading}
          </span>
        ) : qualityFailed || !quality ? (
          <span
            className="text-sm text-zinc-500 dark:text-zinc-400"
            data-testid="profile-overview-score"
          >
            {hub.meterUnavailable}
          </span>
        ) : (
          <span
            className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
            data-testid="profile-overview-score"
          >
            {quality.score}%
          </span>
        )}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {hub.meterLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={PROFILE_HREF.edit}
          className={linkClass}
          data-testid="profile-overview-strip-story"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {hub.overviewStripStory}
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-zinc-800 dark:text-zinc-100">
            {storyDetail}
          </span>
        </Link>
        <Link
          href={profileEditHash('photos')}
          className={linkClass}
          data-testid="profile-overview-strip-photos"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {hub.overviewStripPhotos}
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-zinc-800 dark:text-zinc-100">
            {photoDetail}
          </span>
        </Link>
        <Link
          href={PROFILE_HREF.settings}
          className={linkClass}
          data-testid="profile-overview-strip-matching"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {hub.overviewStripMatching}
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-zinc-800 dark:text-zinc-100">
            {matchingDetail}
          </span>
        </Link>
        <Link
          href={PROFILE_HREF.analysis}
          className={linkClass}
          data-testid="profile-overview-strip-analysis"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {hub.overviewStripAnalysis}
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-zinc-800 dark:text-zinc-100">
            {analysisDetail}
          </span>
        </Link>
      </div>
    </div>
  );
}
