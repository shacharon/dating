'use client';

import type { AppCopySchema } from '@/lib/i18n';

export function LandingBenefits({
  copy,
}: {
  copy: AppCopySchema['landing']['benefits'];
}) {
  const items = [
    { title: copy.depthTitle, body: copy.depthBody },
    { title: copy.signalsTitle, body: copy.signalsBody },
    { title: copy.safetyTitle, body: copy.safetyBody },
  ];

  return (
    <section className="bg-zinc-50 py-16 dark:bg-zinc-900/40 md:py-24">
      <div className="mx-auto max-w-xl px-6">
        <h2 className="mb-10 font-sans text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {copy.title}
        </h2>
        <ul className="space-y-10">
          {items.map((item) => (
            <li key={item.title}>
              <h3 className="mb-1 font-sans text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
