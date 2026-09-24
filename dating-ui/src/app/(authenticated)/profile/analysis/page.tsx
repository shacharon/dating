import { ProfileAnalysisPageClient } from './profile-analysis-page-client';
import { buildPageMetadata } from '@/lib/platform/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) =>
      `${copy.profile.hub.tabAnalysis} · ${copy.profile.hub.title}`,
  });
}

export default function ProfileAnalysisPage() {
  return <ProfileAnalysisPageClient />;
}
