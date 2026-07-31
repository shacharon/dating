import type {
  Evaluation,
  ExtractedSignals,
  ExtractionDomainQualityStatus,
} from '@/lib/profile-types';

export const SIGNAL_KEYS = [
  'ambition',
  'socialBattery',
  'healthBodyConsciousness',
  'emotionalDepth',
  'attachmentSecurity',
  'directness',
  'independence',
  'traditionalism',
  'financialMindset',
  'relationshipClarity',
  'spirituality',
  'lifestylePace',
  'physicalPriority',
  'statusOrientation',
] as const;

export function formatSignalKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function formatDomainConfidence(s: ExtractedSignals): string {
  if (s.domainStatus === 'LOW_DATA' || s.domainStatus === 'UNRELIABLE') {
    return 'Insufficient data';
  }
  const nonNull = Object.values(s.signals).filter((v) => v != null).length;
  if (!s.domainStatus && nonNull < 2) return 'Insufficient data';
  return `${(s.confidence * 100).toFixed(0)}%`;
}

export function domainStatusLabel(s: ExtractedSignals): ExtractionDomainQualityStatus | null {
  if (s.domainStatus) return s.domainStatus;
  const nonNull = Object.values(s.signals).filter((v) => v != null).length;
  if (nonNull < 2) return 'LOW_DATA';
  return 'OK';
}

function countNonNullSignals(block: ExtractedSignals): number {
  return Object.values(block.signals ?? {}).filter((v) => v != null).length;
}

export function isSignalsEmpty(evaluation: Evaluation): boolean {
  return (
    countNonNullSignals(evaluation.self) +
      countNonNullSignals(evaluation.partner) +
      countNonNullSignals(evaluation.relationship) ===
    0
  );
}
