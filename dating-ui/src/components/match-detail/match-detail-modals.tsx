'use client';

import dynamic from 'next/dynamic';
import type { MeMatchDetailDto } from '@/lib/me-matches-api';
import { matchDetailTitle } from '@/app/dating/me-matches/match-display';

const MatchCelebrationModal = dynamic(
  () =>
    import('@/components/match-celebration-modal').then((m) => ({
      default: m.MatchCelebrationModal,
    })),
  { ssr: false },
);

const ReportUserDialog = dynamic(
  () =>
    import('@/components/report-user-dialog').then((m) => ({
      default: m.ReportUserDialog,
    })),
  { ssr: false },
);

type CelebrationData = {
  conversationId: string;
};

type Props = {
  data: MeMatchDetailDto;
  matchId: string;
  celebrationData: CelebrationData | null;
  reportOpen: boolean;
  onDismissCelebration: () => void;
  onCloseReport: () => void;
  onSendMessage: (conversationId: string) => void;
};

/**
 * Lazy-loaded celebration and report dialogs (`dynamic`, `ssr: false`).
 */
export function MatchDetailModals({
  data,
  matchId,
  celebrationData,
  reportOpen,
  onDismissCelebration,
  onCloseReport,
  onSendMessage,
}: Props) {
  return (
    <>
      {celebrationData ? (
        <MatchCelebrationModal
          open
          onClose={onDismissCelebration}
          candidateName={matchDetailTitle(data)}
          photoUrl={data.primaryPhotoUrl ?? null}
          onSendMessage={() => {
            onSendMessage(celebrationData.conversationId);
          }}
        />
      ) : null}
      {reportOpen ? (
        <ReportUserDialog
          open={reportOpen}
          onClose={onCloseReport}
          contextType="MATCH_PROFILE"
          contextId={matchId}
          subjectLabel={matchDetailTitle(data)}
        />
      ) : null}
    </>
  );
}
