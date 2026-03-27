import type { MatchRecommendationDto } from '../_lib/types';

type Props = {
  recommendation?: MatchRecommendationDto | null;
  /** When true, use slightly larger spacing (detail page). */
  variant?: 'card' | 'detail';
};

/**
 * Renders match recommendation as a decision-oriented card:
 * - primaryTakeaway (bold headline)
 * - caution (subtle warning, only if present)
 * - suggestedNextAction (clear CTA-like text)
 *
 * Returns null when `recommendation` is missing (backward compatible).
 */
export function MatchRecommendationSection({ recommendation, variant = 'card' }: Props) {
  if (!recommendation) return null;

  const { primaryTakeaway, caution, suggestedNextAction } = recommendation;
  const gap = variant === 'detail' ? 'gap-3' : 'gap-2.5';
  const padding = variant === 'detail' ? 'p-5' : 'p-4';

  return (
    <div
      className={`flex flex-col ${gap} rounded-lg border border-zinc-200 bg-zinc-50 ${padding} dark:border-zinc-700 dark:bg-zinc-800/50`}
      data-testid="match-recommendation"
    >
      {/* Primary Takeaway - Most Prominent */}
      <p
        className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100"
        data-testid="recommendation-takeaway"
      >
        {primaryTakeaway}
      </p>

      {/* Caution - Secondary, Muted (only if present) */}
      {caution && (
        <p
          className="flex items-start gap-2 text-sm leading-relaxed text-amber-800 dark:text-amber-200"
          data-testid="recommendation-caution"
        >
          <span
            className="mt-0.5 inline-block h-4 w-4 flex-shrink-0 rounded-full bg-amber-100 text-center text-xs leading-4 dark:bg-amber-900/50"
            aria-hidden="true"
          >
            !
          </span>
          <span>{caution}</span>
        </p>
      )}

      {/* Suggested Next Action - Clear but not a button */}
      <p
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        data-testid="recommendation-action"
      >
        → {suggestedNextAction}
      </p>
    </div>
  );
}
