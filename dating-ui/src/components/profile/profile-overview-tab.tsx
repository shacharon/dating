'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { ProfileOverviewHero } from '@/components/profile/profile-overview-hero';
import { ProfileOverviewStoryProse } from '@/components/profile/profile-overview-story-prose';
import { ProfileOverviewTraitChips } from '@/components/profile/profile-overview-trait-chips';
import { ProfileOverviewStatusStrip } from '@/components/profile/profile-overview-status-strip';
import { useProfileQualityRefresh } from '@/components/profile/profile-quality-refresh-context';
import {
  fetchMyLatestAnalysis,
  type MeLatestAnalysisDto,
} from '@/lib/api/me-analysis-api';
import {
  listMyProfilePhotos,
  type MeProfilePhotoDto,
} from '@/lib/api/me-photos-api';
import {
  fetchProfileQuality,
  type ProfileQualityDto,
} from '@/lib/api/profile-quality-api';
import { useAppLocale } from '@/lib/i18n';
import { mapEvaluationToViewModel } from '@/lib/matches/analysis-presentation';
import { PROFILE_HREF } from '@/lib/profile/profile-hub-paths';

type Props = {
  draft: ProfileDraft;
};

/** Profile hub Overview: framing, dating card, prose, chips, Edit, status strip. */
export function ProfileOverviewTab({ draft }: Props) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const { refreshKey } = useProfileQualityRefresh();

  const [photos, setPhotos] = useState<MeProfilePhotoDto[]>([]);
  const [analysis, setAnalysis] = useState<MeLatestAnalysisDto | null>(null);
  const [quality, setQuality] = useState<ProfileQualityDto | null>(null);
  const [qualityLoading, setQualityLoading] = useState(true);
  const [qualityFailed, setQualityFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listMyProfilePhotos()
      .then((list) => {
        if (!cancelled) setPhotos(list);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    fetchMyLatestAnalysis()
      .then((dto) => {
        if (!cancelled) setAnalysis(dto);
      })
      .catch(() => {
        if (!cancelled) setAnalysis(null);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setQualityLoading(true);
    setQualityFailed(false);
    fetchProfileQuality()
      .then((dto) => {
        if (!cancelled) {
          setQuality(dto);
          setQualityFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuality(null);
          setQualityFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setQualityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const highlights = useMemo(() => {
    if (!analysis?.evaluationId || !analysis.evaluationJson) return [];
    const vm = mapEvaluationToViewModel(analysis.evaluationJson);
    const list =
      vm.selfHighlights.length > 0
        ? vm.selfHighlights
        : vm.partnerHighlights;
    return list.slice(0, 3);
  }, [analysis]);

  return (
    <div className="space-y-8" data-testid="profile-overview-tab">
      <p
        className="text-sm text-zinc-600 dark:text-zinc-400"
        data-testid="profile-overview-framing"
      >
        {hub.overviewFraming}
      </p>

      <ProfileOverviewHero draft={draft} photos={photos} />
      <ProfileOverviewStoryProse draft={draft} />
      <ProfileOverviewTraitChips highlights={highlights} />

      <div className="flex justify-center pt-1">
        <Link
          href={PROFILE_HREF.edit}
          data-testid="profile-overview-edit"
          className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus-visible:outline-zinc-100"
        >
          {hub.editProfileCta}
        </Link>
      </div>

      <ProfileOverviewStatusStrip
        draft={draft}
        photos={photos}
        quality={quality}
        qualityLoading={qualityLoading}
        qualityFailed={qualityFailed}
        analysis={analysis}
      />
    </div>
  );
}
