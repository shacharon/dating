import MeMatchesPageClient from './me-matches-page-client';
import { buildPageMetadata } from '@/lib/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.nav.matches,
    description: (copy) => copy.matches.list.subtitle,
  });
}

/**
 * Server Component shell. Infinite scroll + refresh live in
 * `me-matches-page-client.tsx` (me-matches APIs use browser `credentials: 'include'`).
 */
export default function MeMatchesPage() {
  return <MeMatchesPageClient />;
}
