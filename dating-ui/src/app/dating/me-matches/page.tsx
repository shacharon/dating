import type { Metadata } from 'next';
import MeMatchesPageClient from './me-matches-page-client';

export const metadata: Metadata = {
  title: 'Matches',
  description: 'Your recommended matches.',
};

/**
 * Server Component shell. Infinite scroll + refresh live in
 * `me-matches-page-client.tsx` (me-matches APIs use browser `credentials: 'include'`).
 */
export default function MeMatchesPage() {
  return <MeMatchesPageClient />;
}
