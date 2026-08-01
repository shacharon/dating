'use client';

import type { ReactNode } from 'react';
import type { AppCopySchema } from '@/lib/i18n';
import { LandingAtmosphere } from './landing-atmosphere';
import './landing-motion.css';

export function LandingHero({
  copy,
  languageSlot,
  ctaSlot,
}: {
  copy: AppCopySchema['landing'];
  languageSlot?: ReactNode;
  ctaSlot?: ReactNode;
}) {
  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col">
      <LandingAtmosphere />
      {languageSlot ? (
        <div className="absolute end-4 top-4 z-20 sm:end-6 sm:top-6">
          {languageSlot}
        </div>
      ) : null}
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-24">
        <div className="landing-hero-copy relative">
          <div
            className="pointer-events-none absolute -inset-x-4 -inset-y-6 -z-10 bg-gradient-to-r from-zinc-50/95 via-zinc-50/85 to-transparent dark:from-zinc-950/95 dark:via-zinc-950/80 dark:to-transparent"
            aria-hidden
          />
          <p className="mb-3 font-sans text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl">
            {copy.brand}
          </p>
          <h1 className="mb-3 font-sans text-2xl font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
            {copy.title}
          </h1>
          <p className="mb-8 max-w-prose text-base leading-relaxed text-zinc-600 dark:text-zinc-400 md:text-lg">
            {copy.subtitle}
          </p>
          <div className="landing-hero-cta" id="landing-sign-in">
            {ctaSlot}
          </div>
        </div>
      </div>
    </section>
  );
}
