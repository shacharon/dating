# Match Recommendation JSX Examples

## Complete Match Card with Recommendation

```tsx
import { MatchCard } from './match-card';

// Example match with recommendation
const match = {
  id: 'm-ava-01',
  name: 'Ava',
  age: 29,
  compatibilityScore: 88,
  recommendation: {
    explainability: {
      positiveChips: ['Emotional depth', 'Direct communication', 'Shared values'],
      tensionChip: 'Different pace of life',
      reasonShort: 'You both trend together on Emotional depth...',
    },
    primaryTakeaway: 'Strong clear fit, especially around emotional depth.',
    caution: 'Watch for different pace of life.',
    suggestedNextAction: 'Start a conversation',
  },
  explainability: {
    positiveChips: ['Emotional depth', 'Direct communication', 'Shared values'],
    tensionChip: 'Different pace of life',
    reasonShort: 'You both trend together on Emotional depth...',
  },
};

<MatchCard match={match} />
```

## Rendered Output (Card View)

```tsx
<article className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
  {/* Header with name and score */}
  <header className="flex flex-wrap items-baseline justify-between gap-2">
    <div>
      <h2 className="text-lg font-semibold text-zinc-900">
        Ava
        <span className="ml-2 font-normal text-zinc-500">29</span>
      </h2>
      <p className="mt-0.5 font-mono text-xs text-zinc-400">m-ava-01</p>
    </div>
    <div className="rounded-lg bg-zinc-100 px-3 py-1.5 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Match</p>
      <p className="text-xl font-semibold tabular-nums text-zinc-900">88</p>
    </div>
  </header>

  {/* NEW: Recommendation Section (Decision Layer) */}
  <div className="flex flex-col gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
    {/* Primary Takeaway - Bold Headline */}
    <p className="text-base font-semibold leading-snug text-zinc-900">
      Strong clear fit, especially around emotional depth.
    </p>

    {/* Caution - Subtle Warning (conditional) */}
    <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-800">
      <span className="mt-0.5 inline-block h-4 w-4 flex-shrink-0 rounded-full bg-amber-100 text-center text-xs leading-4">
        !
      </span>
      <span>Watch for different pace of life.</span>
    </p>

    {/* Suggested Next Action - Clear CTA Text */}
    <p className="text-sm font-medium text-zinc-700">
      → Start a conversation
    </p>
  </div>

  {/* Explainability Section (Existing Layer) */}
  <div className="flex flex-col gap-2">
    {/* Reason Short */}
    <p className="text-sm leading-relaxed text-zinc-700">
      You both trend together on Emotional depth, Direct communication, and Shared values—that keeps the match feeling strong, not thin. Main tension: different pace of life.
    </p>

    {/* Chips */}
    <ul className="flex flex-wrap gap-2">
      <li>
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
          Emotional depth
        </span>
      </li>
      <li>
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
          Direct communication
        </span>
      </li>
      <li>
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
          Shared values
        </span>
      </li>
      <li>
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-950">
          Different pace of life
        </span>
      </li>
    </ul>
  </div>

  {/* CTA Button */}
  <Link
    href="/dating/matches/m-ava-01"
    className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white"
  >
    View profile
  </Link>
</article>
```

## Detail Page Example

```tsx
import { MatchRecommendationSection } from './match-recommendation-section';
import { MatchExplainabilitySection } from './match-explainability-section';

export default function MatchDetailPage({ match }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Ava
            <span className="ml-2 font-normal text-zinc-500">29</span>
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-400">m-ava-01</p>
        </div>
        <div className="rounded-lg bg-zinc-100 px-4 py-2 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Compatibility
          </p>
          <p className="text-2xl font-semibold tabular-nums text-zinc-900">88</p>
        </div>
      </header>

      {/* Recommendation Section (larger spacing for detail) */}
      <div className="mt-6">
        <MatchRecommendationSection 
          recommendation={match.recommendation} 
          variant="detail" 
        />
      </div>

      {/* Explainability Section */}
      <MatchExplainabilitySection 
        explainability={match.explainability} 
        variant="detail" 
      />

      {/* Footer with actions */}
      <footer className="mt-10 flex flex-col gap-3 border-t border-zinc-100 pt-8">
        <Link href="/dating/matches">Back to matches</Link>
        <Link href={`/dating/feedback?matchId=${match.id}`}>Give feedback</Link>
      </footer>
    </article>
  );
}
```

## Standalone Component Usage

### Basic Usage

```tsx
import { MatchRecommendationSection } from './match-recommendation-section';

<MatchRecommendationSection 
  recommendation={{
    explainability: { /* ... */ },
    primaryTakeaway: "Strong clear fit, especially around emotional depth.",
    caution: "Watch for different pace of life.",
    suggestedNextAction: "Start a conversation"
  }}
/>
```

### Without Caution

```tsx
<MatchRecommendationSection 
  recommendation={{
    explainability: { /* ... */ },
    primaryTakeaway: "Solid fit with good alignment on social rhythm.",
    suggestedNextAction: "Review profile and message"
  }}
/>
```

### Detail Variant

```tsx
<MatchRecommendationSection 
  recommendation={recommendation}
  variant="detail"  // Larger spacing
/>
```

### Backward Compatible (No Recommendation)

```tsx
// Returns null when recommendation is missing
<MatchRecommendationSection recommendation={null} />
<MatchRecommendationSection recommendation={undefined} />
```

## Integration with Existing Components

### Match List Page

```tsx
import { MatchCard } from './match-card';

export default function MatchesPage() {
  const matches = [
    {
      id: 'm-1',
      name: 'Ava',
      age: 29,
      compatibilityScore: 88,
      recommendation: { /* ... */ },  // NEW
      explainability: { /* ... */ },
    },
    // ... more matches
  ];

  return (
    <div className="grid gap-4">
      {matches.map(match => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
```

### API Integration

```tsx
// Fetch from API
async function fetchMatches() {
  const response = await fetch('/api/matches?policyVersion=v2');
  const data = await response.json();
  
  return data.items.map(item => ({
    id: item.matchId,
    name: item.userAName,
    compatibilityScore: item.finalScore,
    recommendation: item.recommendation,  // NEW field from API
    explainability: item.explainability,
  }));
}
```

## Visual Comparison

### Before (Explainability Only)

```
┌──────────────────────────────────────┐
│ Ava, 29                      [88]    │
├──────────────────────────────────────┤
│ You both trend together on           │
│ Emotional depth, Direct              │
│ communication, and Shared values...  │
│                                      │
│ [Emotional depth]                    │
│ [Direct communication]               │
│ [Shared values]                      │
│ [Different pace of life]             │
│                                      │
│ [View profile]                       │
└──────────────────────────────────────┘
```

### After (With Recommendation)

```
┌──────────────────────────────────────┐
│ Ava, 29                      [88]    │
├──────────────────────────────────────┤
│ ┌────────────────────────────────┐   │
│ │ Strong clear fit, especially   │   │  ← NEW: Decision layer
│ │ around emotional depth.        │   │
│ │                                │   │
│ │ ⚠ Watch for different pace     │   │
│ │   of life.                     │   │
│ │                                │   │
│ │ → Start a conversation         │   │
│ └────────────────────────────────┘   │
│                                      │
│ You both trend together on           │  ← Existing: Explainability
│ Emotional depth, Direct              │
│ communication, and Shared values...  │
│                                      │
│ [Emotional depth]                    │
│ [Direct communication]               │
│ [Shared values]                      │
│ [Different pace of life]             │
│                                      │
│ [View profile]                       │
└──────────────────────────────────────┘
```

## Dark Mode Example

```tsx
// Component automatically supports dark mode via Tailwind
<div className="flex flex-col gap-2.5 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
  <p className="text-base font-semibold leading-snug text-zinc-100">
    Strong clear fit, especially around emotional depth.
  </p>
  
  <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-200">
    <span className="mt-0.5 inline-block h-4 w-4 flex-shrink-0 rounded-full bg-amber-900/50 text-center text-xs leading-4">
      !
    </span>
    <span>Watch for different pace of life.</span>
  </p>
  
  <p className="text-sm font-medium text-zinc-300">
    → Start a conversation
  </p>
</div>
```

## Responsive Behavior

```tsx
// Mobile (< 640px)
┌─────────────────────┐
│ Strong clear fit,   │
│ especially around   │
│ emotional depth.    │
│                     │
│ ⚠ Watch for         │
│   different pace    │
│   of life.          │
│                     │
│ → Start a           │
│   conversation      │
└─────────────────────┘

// Desktop (≥ 640px)
┌────────────────────────────────────┐
│ Strong clear fit, especially       │
│ around emotional depth.            │
│                                    │
│ ⚠ Watch for different pace of life.│
│                                    │
│ → Start a conversation             │
└────────────────────────────────────┘
```
