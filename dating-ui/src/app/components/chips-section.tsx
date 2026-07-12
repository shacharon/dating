export interface ChipsViewModel {
  attractionChips?: string[];
  warningChips?: string[];
  lifestyleChips?: string[];
}

interface ChipsSectionProps {
  chips?: ChipsViewModel | null;
  title?: string;
}

function sanitizeGroup(items?: string[]): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, 6);
}

function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'warning' }) {
  const cls =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100'
      : 'border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100';
  return (
    <li className={`rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>{label}</li>
  );
}

export function ChipsSection({ chips, title = 'Highlights' }: ChipsSectionProps) {
  const attraction = sanitizeGroup(chips?.attractionChips);
  const warning = sanitizeGroup(chips?.warningChips);
  const lifestyle = sanitizeGroup(chips?.lifestyleChips);
  const hasAny = attraction.length > 0 || warning.length > 0 || lifestyle.length > 0;

  if (!hasAny) return null;

  return (
    <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="mt-3 space-y-4">
        {attraction.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Attraction
            </p>
            <ul className="flex flex-wrap gap-2">
              {attraction.map((chip) => (
                <Pill key={`a-${chip}`} label={chip} />
              ))}
            </ul>
          </div>
        )}
        {warning.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Watchouts
            </p>
            <ul className="flex flex-wrap gap-2">
              {warning.map((chip) => (
                <Pill key={`w-${chip}`} label={chip} tone="warning" />
              ))}
            </ul>
          </div>
        )}
        {lifestyle.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Lifestyle
            </p>
            <ul className="flex flex-wrap gap-2">
              {lifestyle.map((chip) => (
                <Pill key={`l-${chip}`} label={chip} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
