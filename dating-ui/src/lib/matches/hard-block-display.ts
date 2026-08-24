import type { HardBlockReasonDto } from '@/lib/api/me-matches-api';

/** Shared hard-block copy for list + detail (primary lines + optional evidence). */
export type HardBlockReasonCopy = {
  smokingExcludedViewerToThem: string;
  smokingExcludedThemToViewer: string;
  smokingRequiredViewerToThem: string;
  smokingRequiredThemToViewer: string;
  ageViewerToThem: string;
  ageThemToViewer: string;
  genderViewerToThem: string;
  genderThemToViewer: string;
  proximityViewerToThem: string;
  proximityThemToViewer: string;
  genericViewerToThem: string;
  genericThemToViewer: string;
  evidenceBoth: (viewerQuote: string, counterpartyQuote: string) => string;
  evidenceViewer: (viewerQuote: string) => string;
  evidenceCounterparty: (counterpartyQuote: string) => string;
};

export type FormattedHardBlockReason = {
  primary: string;
  evidence: string | null;
};

function isSmokingDimension(dimension: string): boolean {
  return (
    dimension === 'smoking' ||
    dimension === 'only_non_smokers' ||
    dimension === 'only_smokers'
  );
}

function primaryForReason(
  reason: HardBlockReasonDto,
  copy: HardBlockReasonCopy,
): string | null {
  const { code, dimension, direction } = reason;
  const toThem = direction === 'viewer_to_them';

  if (isSmokingDimension(dimension)) {
    if (code.includes('EXCLUDED_TRAIT_PRESENT')) {
      return toThem
        ? copy.smokingExcludedViewerToThem
        : copy.smokingExcludedThemToViewer;
    }
    if (code.includes('REQUIRED_TRAIT_ABSENT')) {
      return toThem
        ? copy.smokingRequiredViewerToThem
        : copy.smokingRequiredThemToViewer;
    }
  }

  if (dimension === 'AGE') {
    return toThem ? copy.ageViewerToThem : copy.ageThemToViewer;
  }
  if (dimension === 'GENDER') {
    return toThem ? copy.genderViewerToThem : copy.genderThemToViewer;
  }
  if (dimension === 'PROXIMITY') {
    return toThem ? copy.proximityViewerToThem : copy.proximityThemToViewer;
  }

  if (code.startsWith('DB_')) {
    return toThem ? copy.genericViewerToThem : copy.genericThemToViewer;
  }

  return null;
}

function evidenceLine(
  reason: HardBlockReasonDto,
  copy: HardBlockReasonCopy,
): string | null {
  const vq = reason.evidence?.viewerQuote?.trim();
  const cq = reason.evidence?.counterpartyQuote?.trim();
  if (vq && cq) return copy.evidenceBoth(vq, cq);
  if (vq) return copy.evidenceViewer(vq);
  if (cq) return copy.evidenceCounterparty(cq);
  return null;
}

/**
 * Primary = direct human sentence from code/dimension.
 * Evidence = optional quieter quotes line.
 * Falls back to API `message` when code/dimension are unknown.
 */
export function formatHardBlockReason(
  reason: HardBlockReasonDto,
  copy: HardBlockReasonCopy,
): FormattedHardBlockReason {
  const primary = primaryForReason(reason, copy) ?? reason.message;
  return {
    primary,
    evidence: evidenceLine(reason, copy),
  };
}

/** Single-line primary only (tests / simple call sites). */
export function formatHardBlockReasonMessage(
  reason: HardBlockReasonDto,
  copy: HardBlockReasonCopy,
): string {
  return formatHardBlockReason(reason, copy).primary;
}
