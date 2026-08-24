'use client';

import { useState } from 'react';
import type { AppCopySchema, AppLocale } from '@/lib/i18n';
import type { AnalysisViewModel } from '@/lib/matches/analysis-presentation';
import type { MeLatestAnalysisDto } from '@/lib/api/me-analysis-api';
import type { MeProfileDto } from '@/lib/api/me-profile-api';

type PageCopy = AppCopySchema['analysisPage'];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
      {children}
    </h2>
  );
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{text}</p>
    </article>
  );
}

function ReferenceCard({
  title,
  text,
  copy,
}: {
  title: string;
  text: string | null;
  copy: PageCopy;
}) {
  const limit = 220;
  const safeText = text?.trim() ? text.trim() : copy.referenceEmpty;
  const [expanded, setExpanded] = useState(false);
  const isLong = safeText.length > limit;
  const shownText =
    !isLong || expanded ? safeText : `${safeText.slice(0, limit).trimEnd()}...`;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/70">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      <blockquote className="mt-2 border-l-2 border-zinc-300 pl-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {shownText}
      </blockquote>
      {isLong && (
        <button
          type="button"
          className="mt-3 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? copy.showLess : copy.showMore}
        </button>
      )}
    </article>
  );
}

export function AnalysisResultsView({
  data,
  profile,
  vm,
  pageCopy,
  locale,
  reAnalyzeSubmitting,
  pollEnabled,
  onReAnalyze,
}: {
  data: MeLatestAnalysisDto;
  profile: MeProfileDto | null;
  vm: AnalysisViewModel;
  pageCopy: PageCopy;
  locale: AppLocale;
  reAnalyzeSubmitting: boolean;
  pollEnabled: boolean;
  onReAnalyze: () => void;
}) {
  return (
    <>
      <section className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-6 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              {vm.heroTitle}
            </h1>
            {vm.heroSubtitle && (
              <p className="max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                {vm.heroSubtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onReAnalyze}
            disabled={reAnalyzeSubmitting || pollEnabled}
            aria-busy={reAnalyzeSubmitting || pollEnabled}
            data-testid="analysis-rerun-button"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            {reAnalyzeSubmitting || pollEnabled
              ? pageCopy.analysisRunning
              : pageCopy.reRunAnalysis}
          </button>
        </div>
        {vm.note && (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">{vm.note}</p>
        )}
        {data.createdAt && (
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
            {pageCopy.lastRunPrefix}{' '}
            {new Date(data.createdAt).toLocaleString(locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading>{pageCopy.sectionHowWeRead}</SectionHeading>
        <div className="grid gap-3 md:grid-cols-3">
          <InsightCard title={pageCopy.insightAboutYou} text={vm.aboutMeInsight} />
          <InsightCard title={pageCopy.insightHowYouRelate} text={vm.relationshipInsight} />
          <InsightCard
            title={pageCopy.insightWhoYouWant}
            text={vm.partnerPreferenceInsight}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading>{pageCopy.sectionWhatYouWrote}</SectionHeading>
        <div className="grid gap-3 md:grid-cols-3">
          <ReferenceCard
            title={pageCopy.referenceAboutMe}
            text={profile?.aboutMe ?? null}
            copy={pageCopy}
          />
          <ReferenceCard
            title={pageCopy.referenceRelationshipStyle}
            text={profile?.aboutRelationship ?? null}
            copy={pageCopy}
          />
          <ReferenceCard
            title={pageCopy.referencePartnerPreference}
            text={profile?.aboutPartner ?? null}
            copy={pageCopy}
          />
        </div>
      </section>
    </>
  );
}
