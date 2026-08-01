import type { ContentPolicyDecision } from './content-moderation.types';
import { findDatingBlocklistHit } from './dating-policy';

export type ModerationUserFacingDetails = {
  flaggedText: string;
  flaggedTextIndex: number;
  flaggedTextLength: number;
  reason: string;
  suggestion: string;
  exampleAlternative?: string;
};

type DeniedDecision = Extract<ContentPolicyDecision, { allow: false }>;

const GENERIC_REASON =
  'Contains language that violates our community guidelines';
const GENERIC_SUGGESTION = 'Please rephrase your text.';

type CopyPair = {
  reason: string;
  suggestion: string;
  exampleAlternative?: string;
};

function openaiCategoryCopy(category: string): CopyPair {
  const c = category.toLowerCase();
  if (c.includes('sexual')) {
    return {
      reason: 'Contains explicit sexual content',
      suggestion:
        'Please rephrase without explicit sexual content. Focus on personality and interests.',
    };
  }
  if (c.includes('violence')) {
    return {
      reason: 'Contains violent or threatening language',
      suggestion:
        'Please rephrase without threatening or violent language.',
    };
  }
  if (c.includes('hate')) {
    return {
      reason: 'Contains hateful or discriminatory language',
      suggestion: 'Please rephrase without discriminatory language.',
    };
  }
  if (c.includes('harassment')) {
    return {
      reason: 'Contains harassing or bullying language',
      suggestion:
        'Please rephrase respectfully without targeting others.',
    };
  }
  return { reason: GENERIC_REASON, suggestion: GENERIC_SUGGESTION };
}

function datingScoreCopy(): CopyPair {
  return {
    reason: 'Content looks like a sexual solicitation',
    suggestion:
      'Soften the wording; focus on personality and shared interests',
    exampleAlternative:
      'Looking for a genuine connection and good conversation',
  };
}

function blocklistCopy(patternSource: string): CopyPair {
  const src = patternSource.toLowerCase();
  if (src.includes('nudes')) {
    return {
      reason: 'Request for sexual images',
      suggestion: 'Do not ask for nude photos',
      exampleAlternative:
        'Happy to chat and get to know each other first',
    };
  }
  if (src.includes('fuck')) {
    return {
      reason: 'Direct sexual solicitation',
      suggestion:
        'Describe connection or interests without explicit sexual language',
      exampleAlternative:
        'Looking for someone adventurous and open-minded',
    };
  }
  return {
    reason: GENERIC_REASON,
    suggestion:
      'Describe connection or interests without explicit sexual language',
    exampleAlternative:
      'Looking for someone adventurous and open-minded',
  };
}

function fullTextSpan(text: string): Pick<
  ModerationUserFacingDetails,
  'flaggedText' | 'flaggedTextIndex' | 'flaggedTextLength'
> {
  return {
    flaggedText: text,
    flaggedTextIndex: 0,
    flaggedTextLength: text.length,
  };
}

/**
 * Build user-facing moderation details for HTTP 400 bodies.
 * Does not include scores or internal diagnostics.
 */
export function buildModerationUserFacingDetails(input: {
  text: string;
  decision: DeniedDecision;
  surface: 'profile' | 'message';
}): ModerationUserFacingDetails {
  const text = input.text.trim();
  const { decision } = input;

  if (decision.source === 'dating_blocklist') {
    const hit = findDatingBlocklistHit(text);
    const copy = blocklistCopy(hit?.patternSource ?? '');
    if (hit) {
      return {
        flaggedText: hit.matchedText,
        flaggedTextIndex: hit.index,
        flaggedTextLength: hit.length,
        reason: copy.reason,
        suggestion: copy.suggestion,
        ...(copy.exampleAlternative
          ? { exampleAlternative: copy.exampleAlternative }
          : {}),
      };
    }
    return {
      ...fullTextSpan(text),
      reason: copy.reason,
      suggestion: copy.suggestion,
      ...(copy.exampleAlternative
        ? { exampleAlternative: copy.exampleAlternative }
        : {}),
    };
  }

  if (decision.source === 'dating_score') {
    const copy = datingScoreCopy();
    return {
      ...fullTextSpan(text),
      reason: copy.reason,
      suggestion: copy.suggestion,
      exampleAlternative: copy.exampleAlternative,
    };
  }

  // openai (and any unexpected deny source treated as category map)
  const copy = openaiCategoryCopy(decision.category);
  return {
    ...fullTextSpan(text),
    reason: copy.reason,
    suggestion: copy.suggestion,
  };
}
