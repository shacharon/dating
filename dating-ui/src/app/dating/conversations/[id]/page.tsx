import ConversationDetailPageClient from './conversation-detail-page-client';

export function generateStaticParams() {
  return [{ id: '__export__' }];
}

export default function ConversationDetailPage() {
  return <ConversationDetailPageClient />;
}
