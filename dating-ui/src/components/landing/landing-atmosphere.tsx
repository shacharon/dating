'use client';

import './landing-motion.css';

/**
 * Full-bleed abstract connection motif (SVG). Decorative only.
 */
export function LandingAtmosphere() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-zinc-50 to-teal-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/40" />
      <svg
        className="landing-atmosphere-drift absolute -inset-[8%] h-[116%] w-[116%] text-teal-700/25 dark:text-teal-400/20"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M220 420c80-120 200-180 320-160 140 24 220 120 280 200"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M680 280c60 40 120 120 140 220"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <circle cx="280" cy="360" r="54" fill="currentColor" opacity="0.12" />
        <circle cx="820" cy="480" r="64" fill="currentColor" opacity="0.1" />
        <circle cx="280" cy="360" r="18" fill="currentColor" opacity="0.35" />
        <circle cx="820" cy="480" r="18" fill="currentColor" opacity="0.35" />
        <path
          d="M340 380c90 20 160 40 240 70"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
          opacity="0.5"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-50/90 via-transparent to-zinc-50/60 dark:from-zinc-950/95 dark:via-transparent dark:to-zinc-950/70" />
    </div>
  );
}
