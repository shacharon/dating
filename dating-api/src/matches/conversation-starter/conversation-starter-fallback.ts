import type { ConversationStarterFactPack } from './conversation-starter.types';
import {
  OPENER_MAX_WORDS,
  cleanOpenerRaw,
  parseSharedInterestLabels,
} from './conversation-starter-validate';

function withinWordCap(line: string): string | null {
  const cleaned = cleanOpenerRaw(line);
  if (!cleaned) return null;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length <= OPENER_MAX_WORDS) return cleaned;
  return `${words.slice(0, OPENER_MAX_WORDS).join(' ')}?`;
}

/**
 * Deterministic opener when LLM fails. Null when no shared interest context.
 * Never returns generic "Hey".
 */
export function buildFallbackConversationStarter(
  factPack: ConversationStarterFactPack,
): string | null {
  const tag = factPack.sharedInterests[0]?.trim();
  if (tag) {
    return withinWordCap(
      `I saw you're into ${tag} too — what's your favorite part?`,
    );
  }

  const note = factPack.sharedInterestNote?.trim();
  if (note) {
    const labels = parseSharedInterestLabels(note);
    if (labels[0]) {
      return withinWordCap(
        `I saw you're into ${labels[0]} too — what's your favorite part?`,
      );
    }
  }

  return null;
}

export { parseSharedInterestLabels };
