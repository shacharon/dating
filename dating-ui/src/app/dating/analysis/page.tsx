import DatingAnalysisPageClient from './analysis-page-client';
import { buildPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.nav.analysis,
    description: () => 'Your profile analysis results and progress.',
  });
}

/**
 * Server Component shell. Interactive polling / re-analyze lives in
 * `analysis-page-client.tsx` (no safe cookie-forwarding API fetch on server yet).
 */
export default function DatingAnalysisPage() {
  return <DatingAnalysisPageClient />;
}
