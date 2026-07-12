import { ErrorCodes } from '../logging/error-codes';
import {
  detectProfanity,
  logProfanityIfDetected,
} from './conversation-message-profanity';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';

describe('conversation-message-profanity', () => {
  const obs = {
    trace: jest.fn(),
  } as unknown as StructuredObservabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectProfanity()', () => {
    it('returns false for clean text', () => {
      expect(detectProfanity('Hello, nice to meet you!')).toBe(false);
    });

    it('returns true when text contains a placeholder token', () => {
      expect(detectProfanity('This has badword1 in it')).toBe(true);
      expect(detectProfanity('BADWORD2')).toBe(true);
    });
  });

  describe('logProfanityIfDetected()', () => {
    it('does not call obs when text is clean', () => {
      logProfanityIfDetected(obs, 'user_1', 'conv_1', 'Hello!');
      expect(obs.trace).not.toHaveBeenCalled();
    });

    it('calls obs.trace once for profanity without throwing', () => {
      expect(() =>
        logProfanityIfDetected(obs, 'user_1', 'conv_1', 'badword1 hi'),
      ).not.toThrow();

      expect(obs.trace).toHaveBeenCalledTimes(1);
      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringMatching(
          /profanity detected userId=user_1 conversationId=conv_1 textLength=\d+/,
        ),
        ErrorCodes.ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED,
      );
      const message = (obs.trace as jest.Mock).mock.calls[0][0] as string;
      expect(message).not.toContain('badword1');
    });
  });
});
