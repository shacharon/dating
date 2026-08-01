'use client';

import dynamic from 'next/dynamic';

const ReportUserDialog = dynamic(
  () =>
    import('@/components/report-user-dialog').then((m) => ({
      default: m.ReportUserDialog,
    })),
  { ssr: false },
);

type Props = {
  conversationId: string;
  subjectLabel: string;
  reportOpen: boolean;
  onCloseReport: () => void;
};

/**
 * Lazy-loaded report dialog for a conversation (`dynamic`, `ssr: false`).
 */
export function ConversationModals({
  conversationId,
  subjectLabel,
  reportOpen,
  onCloseReport,
}: Props) {
  if (!reportOpen) return null;
  return (
    <ReportUserDialog
      open={reportOpen}
      onClose={onCloseReport}
      contextType="CONVERSATION"
      contextId={conversationId}
      subjectLabel={subjectLabel}
    />
  );
}
