import { useState, useCallback } from 'react';
import { upsertMatchFeedback } from '@/lib/me-matches-api';

type FeedbackSentiment = 'POSITIVE' | 'NEGATIVE' | null;

interface UseMatchFeedbackOptions {
  matchId: string;
  initialSentiment?: FeedbackSentiment;
}

interface UseMatchFeedbackReturn {
  submitFeedback: (sentiment: 'positive' | 'negative') => Promise<void>;
  submitting: boolean;
  sentiment: FeedbackSentiment;
  setSentiment: (sentiment: FeedbackSentiment) => void;
  submitted: boolean;
  error: string | null;
}

export function useMatchFeedback({
  matchId,
  initialSentiment = null,
}: UseMatchFeedbackOptions): UseMatchFeedbackReturn {
  const [submitting, setSubmitting] = useState(false);
  const [sentiment, setSentiment] = useState<FeedbackSentiment>(initialSentiment);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useCallback(
    async (feedbackSentiment: 'positive' | 'negative') => {
      if (submitting) return;

      setError(null);
      setSubmitting(true);

      try {
        const result = await upsertMatchFeedback(matchId, feedbackSentiment);
        setSentiment(result.sentiment);
        setSubmitted(true);
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : 'Could not submit feedback.',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [matchId, submitting],
  );

  return {
    submitFeedback,
    submitting,
    sentiment,
    setSentiment,
    submitted,
    error,
  };
}
