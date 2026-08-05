import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlgorithmExplainerClient } from './algorithm-explainer-client';

export const metadata: Metadata = {
  title: 'How we match you',
};

export default function AlgorithmExplainerPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-6 py-12" />}>
      <AlgorithmExplainerClient />
    </Suspense>
  );
}
