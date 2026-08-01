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
