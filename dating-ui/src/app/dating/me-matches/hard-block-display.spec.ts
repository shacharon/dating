import { describe, it, expect } from 'vitest';
import {
  formatHardBlockReason,
  formatHardBlockReasonMessage,
  type HardBlockReasonCopy,
} from './hard-block-display';
import type { MatchHardBlockReasonVM } from '@/lib/matches/match-view-models';

const copy: HardBlockReasonCopy = {
  smokingExcludedViewerToThem:
    'This person smokes, while your preferences exclude smokers.',
  smokingExcludedThemToViewer:
    'You smoke, while their preferences exclude smokers.',
  smokingRequiredViewerToThem:
    "This person doesn't smoke, while you only want smokers.",
  smokingRequiredThemToViewer:
    "You don't smoke, while they only want smokers.",
  ageViewerToThem: 'Their age is outside your preferred age range.',
  ageThemToViewer: 'Your age is outside their preferred age range.',
  genderViewerToThem:
    'Their gender is outside your partner gender preferences.',
  genderThemToViewer:
    'Your gender is outside their partner gender preferences.',
  proximityViewerToThem: 'They are outside your preferred distance.',
  proximityThemToViewer: 'You are outside their preferred distance.',
  genericViewerToThem:
    'Something in their profile conflicts with your preferences.',
  genericThemToViewer:
    'Something in your profile conflicts with their preferences.',
  evidenceBoth: (vq, cq) => `“${vq}” · “${cq}”`,
  evidenceViewer: (vq) => `“${vq}”`,
  evidenceCounterparty: (cq) => `“${cq}”`,
};

describe('formatHardBlockReason', () => {
  it('uses direct smoking copy as primary and quotes as evidence', () => {
    const reason: MatchHardBlockReasonVM = {
      code: 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT',
      dimension: 'smoking',
      direction: 'viewer_to_them',
      message: 'English fallback',
      viewerQuote: "I don't want smokers",
      counterpartyQuote: 'I smoke',
    };
    const formatted = formatHardBlockReason(reason, copy);
    expect(formatted.primary).toBe(
      'This person smokes, while your preferences exclude smokers.',
    );
    expect(formatted.evidence).toBe(
      "“I don't want smokers” · “I smoke”",
    );
    expect(formatHardBlockReasonMessage(reason, copy)).toBe(formatted.primary);
  });

  it('falls back to API message for unknown codes', () => {
    const reason: MatchHardBlockReasonVM = {
      code: 'SOME_UNKNOWN_CODE',
      dimension: 'mystery',
      direction: 'viewer_to_them',
      message: 'Their age is outside your preferred age range.',
      viewerQuote: null,
      counterpartyQuote: null,
    };
    expect(formatHardBlockReason(reason, copy).primary).toBe(
      'Their age is outside your preferred age range.',
    );
  });

  it('formats them_to_viewer smoking exclude', () => {
    const reason: MatchHardBlockReasonVM = {
      code: 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT',
      dimension: 'smoking',
      direction: 'them_to_viewer',
      message: 'fallback',
      viewerQuote: 'I smoke',
      counterpartyQuote: 'Non-smokers only',
    };
    const formatted = formatHardBlockReason(reason, copy);
    expect(formatted.primary).toBe(
      'You smoke, while their preferences exclude smokers.',
    );
    expect(formatted.evidence).toBe('“I smoke” · “Non-smokers only”');
  });

  it('formats AGE without evidence', () => {
    const reason: MatchHardBlockReasonVM = {
      code: 'AGE_BELOW_MIN',
      dimension: 'AGE',
      direction: 'viewer_to_them',
      message: 'fallback',
      viewerQuote: null,
      counterpartyQuote: null,
    };
    const formatted = formatHardBlockReason(reason, copy);
    expect(formatted.primary).toBe(
      'Their age is outside your preferred age range.',
    );
    expect(formatted.evidence).toBeNull();
  });
});
