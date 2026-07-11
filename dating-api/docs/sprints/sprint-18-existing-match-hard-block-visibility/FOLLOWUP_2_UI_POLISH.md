# Sprint 18 Follow-up #2: Hard-Blocked Match Card UI Polish

## Overview

This follow-up addresses UX improvements to the hard-blocked match card display based on user feedback. The changes improve clarity, hierarchy, and usability of hard-blocked match cards on both list and detail pages.

## Changes Implemented

### 1. **"You liked them" → "You liked this profile"**

**Rationale:** "Them" is awkward when referring to a single, visible profile. The singular pronoun is clearer and more natural.

**Files changed:**
- `dating-ui/src/lib/i18n/types.ts`
- `dating-ui/src/lib/i18n/en.ts`
- `dating-ui/src/lib/i18n/es.ts`
- `dating-ui/src/lib/i18n/he.ts`
- `dating-ui/src/app/dating/me-matches/page.tsx`
- `dating-ui/src/app/dating/me-matches/[id]/page.tsx`

**Key change:**
```typescript
// Before
youLikedThem: "You liked them"

// After
youLikedThisProfile: "You liked this profile"
```

### 2. **Show only first reason + count on list page**

**Rationale:** When multiple hard-block reasons exist, showing all of them on the list card makes it too long and cluttered. The first reason gives context, and a count indicates there's more detail available by clicking through.

**Implementation:**
- **List page:** Shows only the first reason + "X more mismatches" count
- **Detail page:** Shows all reasons

**Files changed:**
- `dating-ui/src/lib/i18n/types.ts` (added `moreReasonsCount` function)
- `dating-ui/src/lib/i18n/en.ts` (added count copy)
- `dating-ui/src/lib/i18n/es.ts` (added count copy)
- `dating-ui/src/lib/i18n/he.ts` (added count copy)
- `dating-ui/src/app/dating/me-matches/page.tsx` (slice to first reason, show count)

**Example output:**
```
[No longer a match]

This person smokes, while your preferences exclude smokers.
You: "don't want smokers" · Them: "I smoke"

+ 2 more mismatches
```

### 3. **Add "You:" and "Them:" labels to evidence quotes**

**Rationale:** The quote line `"don't want smokers" · "I smoke"` doesn't explain whose quote is whose. Adding labels makes it immediately clear.

**Files changed:**
- `dating-ui/src/lib/i18n/en.ts` (evidence templates)
- `dating-ui/src/lib/i18n/es.ts` (evidence templates with "Tu:" / "Ellos:")
- `dating-ui/src/lib/i18n/he.ts` (evidence templates with Hebrew labels)
- `dating-ui/src/app/dating/me-matches/hard-block-display.ts` (formatting logic)
- `dating-ui/src/app/dating/me-matches/hard-block-display.spec.ts` (test expectations)

**Before:**
```
"don't want smokers" · "I smoke"
```

**After:**
```
You: "don't want smokers" · Them: "I smoke"
```

## i18n Updates

### English (`en.ts`)
```typescript
hardBlocked: {
  // ...
  youLikedThisProfile: "You liked this profile",
  moreReasonsCount: (count) => `+ ${count} more mismatch${count === 1 ? '' : 'es'}`,
  // ...
  evidenceBoth: (viewerQuote, counterpartyQuote) =>
    `You: "${viewerQuote}" · Them: "${counterpartyQuote}"`,
  evidenceViewer: (viewerQuote) => `You: "${viewerQuote}"`,
  evidenceCounterparty: (counterpartyQuote) => `Them: "${counterpartyQuote}"`,
}
```

### Spanish (`es.ts`)
```typescript
hardBlocked: {
  // ...
  youLikedThisProfile: "Te gusto este perfil",
  moreReasonsCount: (count) => `+ ${count} diferencia${count === 1 ? '' : 's'} más`,
  // ...
  evidenceBoth: (viewerQuote, counterpartyQuote) =>
    `Tu: "${viewerQuote}" · Ellos: "${counterpartyQuote}"`,
  evidenceViewer: (viewerQuote) => `Tu: "${viewerQuote}"`,
  evidenceCounterparty: (counterpartyQuote) => `Ellos: "${counterpartyQuote}"`,
}
```

### Hebrew (`he.ts`)
```typescript
hardBlocked: {
  // ...
  youLikedThisProfile: "אהבת את הפרופיל הזה",
  moreReasonsCount: (count) => `+ ${count} אי התאמות נוספות`,
  // ...
  evidenceBoth: (viewerQuote, counterpartyQuote) =>
    `אתה: "${viewerQuote}" · הם: "${counterpartyQuote}"`,
  evidenceViewer: (viewerQuote) => `אתה: "${viewerQuote}"`,
  evidenceCounterparty: (counterpartyQuote) => `הם: "${counterpartyQuote}"`,
}
```

## UI Component Changes

### List Page (`page.tsx`)

**Before:** Displayed all reasons in a loop
```tsx
<ul className="space-y-1">
  {hardBlocked.reasons.map((r) => {
    const formatted = formatHardBlockReason(r, listCopy.hardBlocked);
    return (
      <li key={`${r.direction}:${r.dimension}:${r.code}`}>
        <p>{formatted.primary}</p>
        {formatted.evidence && <p>{formatted.evidence}</p>}
      </li>
    );
  })}
</ul>
```

**After:** Shows only first reason + count
```tsx
{(() => {
  const firstReason = hardBlocked.reasons[0];
  if (!firstReason) return null;
  const formatted = formatHardBlockReason(firstReason, listCopy.hardBlocked);
  return (
    <div className="space-y-1">
      <p className="text-sm text-zinc-800 dark:text-zinc-200">
        {formatted.primary}
      </p>
      {formatted.evidence && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatted.evidence}
        </p>
      )}
      {hardBlocked.reasons.length > 1 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {listCopy.hardBlocked.moreReasonsCount(hardBlocked.reasons.length - 1)}
        </p>
      )}
    </div>
  );
})()}
```

### Detail Page (`[id]/page.tsx`)

**No structural changes** - still displays all reasons, but uses updated copy for "You liked this profile" and formatted evidence quotes.

## Test Updates

### `hard-block-display.spec.ts`
Updated test expectations to include "You:" and "Them:" labels in evidence:
```typescript
expect(formatted.evidence).toBe('You: "I don\'t want smokers" · Them: "I smoke"');
```

### `page.spec.tsx` (list page)
Updated test to check for:
- "You liked this profile" (instead of "You liked them")
- Evidence with labels: `You: "I don't want smokers"`

## Test Results

✅ **All tests passing (63 total):**
- Backend hard-block tests: 12 passed
- Frontend list page tests: 16 passed
- Frontend detail page tests: 31 passed
- Hard-block display utility tests: 4 passed

## User Experience Improvements

### Before
```
[No longer a match]
You liked them

This person smokes, while your preferences exclude smokers.
"don't want smokers" · "I smoke"

Their age is outside your preferred age range.
"25-35" · "42"

You're 50km apart (their max distance is 20km).
```

### After (List Card)
```
[No longer a match]
You liked this profile

This person smokes, while your preferences exclude smokers.
You: "don't want smokers" · Them: "I smoke"

+ 2 more mismatches
```

### After (Detail Page - shows all)
```
[No longer a match]
You liked this profile

Why:
• This person smokes, while your preferences exclude smokers.
  You: "don't want smokers" · Them: "I smoke"

• Their age is outside your preferred age range.

• You're 50km apart (their max distance is 20km).

[Review preferences]
```

## Backwards Compatibility

✅ **Fully backwards compatible**
- API response format unchanged (still returns all reasons)
- Display logic is UI-only (slicing to first reason happens in component)
- No database schema changes
- No breaking changes to existing contracts

## Future Considerations

1. **Reason prioritization:** Currently shows first reason. Consider adding a priority/severity field to show the most important reason first.
2. **Expandable reasons on list:** Instead of navigating to detail, could add an inline expand/collapse for remaining reasons.
3. **Evidence formatting:** Could add more context to evidence (e.g., which field the quote came from).

## Related Files

**Backend:**
- No changes (all changes UI-only)

**Frontend:**
- `dating-ui/src/lib/i18n/types.ts`
- `dating-ui/src/lib/i18n/en.ts`
- `dating-ui/src/lib/i18n/es.ts`
- `dating-ui/src/lib/i18n/he.ts`
- `dating-ui/src/app/dating/me-matches/page.tsx`
- `dating-ui/src/app/dating/me-matches/[id]/page.tsx`
- `dating-ui/src/app/dating/me-matches/hard-block-display.ts`
- `dating-ui/src/app/dating/me-matches/hard-block-display.spec.ts`
- `dating-ui/src/app/dating/me-matches/page.spec.tsx`

---

**Implementation Date:** July 11, 2026  
**Status:** ✅ Complete and tested
