import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';

const PLACEHOLDER_PROFANITY = ['badword1', 'badword2'];

export function detectProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PLACEHOLDER_PROFANITY.some((word) => lower.includes(word));
}

export function logProfanityIfDetected(
  obs: StructuredObservabilityService,
  sessionUserId: string,
  conversationId: string,
  text: string,
): void {
  if (!detectProfanity(text)) return;
  obs.trace(
    `me conversations message profanity detected userId=${sessionUserId} conversationId=${conversationId} textLength=${text.length}`,
    ErrorCodes.ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED,
  );
}
