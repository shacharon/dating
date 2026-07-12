import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

/**
 * Legacy match detail — redirects to active product path.
 * See `dating/matches/page.tsx` for list redirect rationale.
 */
export default async function LegacyMatchDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/dating/me-matches/${encodeURIComponent(id)}`);
}
