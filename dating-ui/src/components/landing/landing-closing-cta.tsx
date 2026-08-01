'use client';

import type { AppCopySchema } from '@/lib/i18n';

export function LandingClosingCta({
  copy,
}: {
  copy: AppCopySchema['landing']['closing'];
}) {
  return (
    <section className="bg-white py-16 dark:bg-zinc-950 md:py-20">
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="mb-2 font-sans text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {copy.title}
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {copy.subtitle}
        </p>
        <button
          type="button"
          className="min-h-11 rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          onClick={() => {
            document
              .getElementById('landing-sign-in')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          {copy.cta}
        </button>
      </div>
    </section>
  );
}
