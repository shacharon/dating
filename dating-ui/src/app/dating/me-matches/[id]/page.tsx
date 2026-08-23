import MeMatchDetailPageClient from './me-match-detail-page-client';

export function generateStaticParams() {
  return [{ id: '__export__' }];
}

export default function MeMatchDetailPage() {
  return <MeMatchDetailPageClient />;
}
