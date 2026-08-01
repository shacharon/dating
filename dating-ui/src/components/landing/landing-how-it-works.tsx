'use client';

import type { AppCopySchema } from '@/lib/i18n';

export function LandingHowItWorks({
  copy,
}: {
  copy: AppCopySchema['landing']['how'];
}) {
  const steps = [
    { title: copy.step1Title, body: copy.step1Body },
    { title: copy.step2Title, body: copy.step2Body },
    { title: copy.step3Title, body: copy.step3Body },
  ];

  return (
    <section className="bg-white py-16 dark:bg-zinc-950 md:py-24">
      <div className="mx-auto max-w-xl px-6">
        <h2 className="mb-10 font-sans text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {copy.title}
        </h2>
        <ol className="space-y-10">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center font-sans text-sm font-semibold text-teal-800 dark:text-teal-300"
                aria-hidden
              >
                {i + 1}
              </span>
              <div>
                <h3 className="mb-1 font-sans text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
