import MatchQualityProfilePageClient from './match-quality-profile-page-client';

export function generateStaticParams() {
  return [{ profileId: '__export__' }];
}

export default function AdminMatchQualityCandidatePage() {
  return <MatchQualityProfilePageClient />;
}
