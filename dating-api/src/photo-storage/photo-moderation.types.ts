export type RejectionReasonCode =
  | 'no_face'
  | 'explicit_content'
  | 'low_quality'
  | 'not_real_person'
  | 'other';

export const REJECTION_REASON_CODES: readonly RejectionReasonCode[] = [
  'no_face',
  'explicit_content',
  'low_quality',
  'not_real_person',
  'other',
] as const;

export function isRejectionReasonCode(raw: string): raw is RejectionReasonCode {
  return (REJECTION_REASON_CODES as readonly string[]).includes(raw);
}

/** EN copy for emails + default rejectionReason text. UI i18n mirrors these keys. */
export const REJECTION_REASON_USER_COPY_EN: Record<RejectionReasonCode, string> =
  {
    no_face:
      "We couldn't detect a clear face in your photo. Please upload a photo where your face is visible.",
    explicit_content: "Your photo doesn't meet our community guidelines.",
    low_quality:
      'Your photo quality is too low. Please upload a higher resolution image.',
    not_real_person:
      'Please upload a photo of yourself (not a celebrity, meme, or stock image).',
    other: 'Your photo was not approved. Please try a different photo.',
  };

export type PhotoModerationResultJson = {
  source: 'legacy' | 'stub' | 'ml' | 'manual' | 'sla';
  decision?: 'approved' | 'rejected' | 'flagged';
  mlConfidence?: number;
  mlLabels?: string[];
  faceCount?: number;
  rejectionReasonCode?: RejectionReasonCode;
  reviewedBy?: string;
  reviewedAt?: string;
  slaRule?: 'flagged_6h_low' | 'flagged_24h';
  error?: string;
};

export type PhotoModerationOutcomeStatus =
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED_FOR_REVIEW';

export type PhotoModerationOutcome = {
  status: PhotoModerationOutcomeStatus;
  result: PhotoModerationResultJson;
  rejectionReasonCode?: RejectionReasonCode;
  rejectionReason?: string | null;
};

export function parseModerationResultJson(
  raw: unknown,
): PhotoModerationResultJson | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as PhotoModerationResultJson;
}

export function maxMlConfidence(labels: Array<{ Confidence?: number }>): number {
  let max = 0;
  for (const label of labels) {
    const c = label.Confidence;
    if (typeof c === 'number' && Number.isFinite(c) && c > max) max = c;
  }
  return max;
}
