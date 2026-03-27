import type { MatchExplainabilityDto } from '../_lib/types';

type Props = {
  explainability?: MatchExplainabilityDto | null;
  /** When true, use slightly larger spacing (detail page). */
  variant?: 'card' | 'detail';
};

const POSITIVE_LIMIT = 3;

/**
 * Renders engine explainability: subtitle + positive chips + optional tension chip.
 * Returns null when `explainability` is missing (backward compatible).
 */
export function MatchExplainabilitySection({ explainability, variant = 'card' }: Props) {
  if (!explainability) return null;

  const { reasonShort, positiveChips, tensionChip } = explainability;
  const chips = positiveChips.slice(0, POSITIVE_LIMIT);
  const gap = variant === 'detail' ? 'gap-2.5' : 'gap-2';

  return (
    <div className={`flex flex-col ${variant === 'detail' ? 'mt-6' : ''} ${gap}`}>
      <p
        className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
        data-testid="explainability-reason"
      >
        {reasonShort}
      </p>
      {(chips.length > 0 || tensionChip) && (
        <ul
          className="flex flex-wrap gap-2"
          aria-label="Match explainability highlights"
          data-testid="explainability-chips"
        >
          {chips.map((label) => (
            <li key={label}>
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100">
                {label}
              </span>
            </li>
          ))}
          {tensionChip ? (
            <li>
              <span
                className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
                data-testid="explainability-tension-chip"
              >
                {tensionChip}
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
