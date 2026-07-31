import type { Metadata } from 'next';
import DatingAnalysisPageClient from './analysis-page-client';

export const metadata: Metadata = {
  title: 'Analysis',
  description: 'Your profile analysis results and progress.',
};

/**
 * Server Component shell. Interactive polling / re-analyze lives in
 * `analysis-page-client.tsx` (no safe cookie-forwarding API fetch on server yet).
 */
export default function DatingAnalysisPage() {
  return <DatingAnalysisPageClient />;
}
