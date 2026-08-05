'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAppLocale } from '@/lib/i18n/use-app-locale';
import { emitProductLog } from '@/lib/observability/product-logger';
import { getLocaleDirection } from '@/lib/i18n';

function resolveFromParam(
  raw: string | null,
): 'detail' | 'browse' | 'direct' | undefined {
  if (raw === 'detail' || raw === 'browse' || raw === 'direct') return raw;
  return undefined;
}

/**
 * Public algorithm transparency explainer (Sprint 43 Story 1).
 */
export function AlgorithmExplainerClient() {
  const { locale, copy } = useAppLocale();
  const c = copy.algorithmExplainer;
  const searchParams = useSearchParams();
  const from = resolveFromParam(searchParams.get('from'));
  const dir = getLocaleDirection(locale);

  useEffect(() => {
    emitProductLog({
      level: 'trace',
      route: '/about/algorithm',
      message: 'algorithm_explainer_viewed',
      meta: {
        event: 'algorithm_explainer_viewed',
        ...(from ? { from } : {}),
      },
    });
  }, [from]);

  return (
    <main
      dir={dir}
      lang={locale}
      className="mx-auto max-w-2xl px-6 py-12 text-zinc-900 dark:text-zinc-100"
      data-testid="algorithm-explainer-page"
    >
      <p className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          {c.back}
        </Link>
      </p>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{c.title}</h1>
      <p className="mb-8 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
        {c.intro}
      </p>

      <section className="mb-10 space-y-6">
        <h2 className="text-lg font-semibold">{c.factorsTitle}</h2>
        <Factor title={c.mutualFitTitle} body={c.mutualFitBody} />
        <Factor title={c.relationshipTitle} body={c.relationshipBody} />
        <Factor title={c.valuesTitle} body={c.valuesBody} />
        <Factor title={c.interestsTitle} body={c.interestsBody} />
        <Factor title={c.frictionTitle} body={c.frictionBody} />
      </section>

      <section className="mb-10 space-y-3">
        <h2 className="text-lg font-semibold">{c.priorityTitle}</h2>
        <ul className="list-disc space-y-2 ps-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <li>{c.priorityHigh}</li>
          <li>{c.priorityGood}</li>
          <li>{c.priorityOther}</li>
        </ul>
      </section>

      <section className="mb-10 space-y-3">
        <h2 className="text-lg font-semibold">{c.challengesWhyTitle}</h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {c.challengesWhyBody}
        </p>
      </section>

      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
        {c.weightsNote}
      </p>
    </main>
  );
}

function Factor({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {body}
      </p>
    </div>
  );
}
