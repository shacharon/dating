import ConversationsPageClient from './conversations-page-client';
import { buildPageMetadata } from '@/lib/platform/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.nav.conversations,
    description: (copy) => copy.conversations.list.subtitle,
  });
}

/**
 * Server Component shell. List + realtime unread live in
 * `conversations-page-client.tsx`.
 */
export default function ConversationsPage() {
  return <ConversationsPageClient />;
}
