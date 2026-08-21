# Story 02 — Extract Shared Text-Match Utilities

**Sprint:** 60  
**Effort:** 1 day  
**Risk:** ⚡ LOW (pure extraction, no logic changes)  
**Status:** Planned

---

## Objective

Consolidate 5 duplicate copies of keyword text-matching helpers into one shared utility module.

**Current problem:** `isNegatedBefore`, `escapeRegExp`, `scanPhrases` are copy-pasted across:
- `evaluate/enrichment-v2.ts`
- `holy-grail-matching/interest-tags-text.extract.ts`
- `holy-grail-matching/lifestyle-signals-text.extract.ts`
- `holy-grail-matching/personality-traits-text.extract.ts`
- `holy-grail-matching/dealbreaker-signals-text.extract.ts`

**Risk:** Subtle behavioral drift (regex differences already observed between enrichment vs HG).

---

## Design

### New File Structure

```
dating-api/src/shared/
  └── text-match.utils.ts       // Shared keyword helpers
  └── text-match.utils.spec.ts  // Unit tests
```

### API

```typescript
// text-match.utils.ts

/**
 * Check if a keyword match is negated by "not" within 6 words before.
 * @example isNegatedBefore("I am not interested", 9) → true
 */
export function isNegatedBefore(
  haystackLower: string,
  matchStart: number,
): boolean {
  const before = haystackLower.slice(0, matchStart);
  const trimmed = before.trimEnd();
  return /\bnot(\s+[\w'-]+){0,6}\s*$/i.test(trimmed);
}

/**
 * Escape special regex characters for literal matching.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scan text for phrase matches, returning all occurrences.
 */
export interface PhraseMatch {
  phrase: string;
  index: number;
  negated: boolean;
}

export function scanPhrases(
  text: string,
  phrases: string[],
  checkNegation = true,
): PhraseMatch[] {
  const textLower = text.toLowerCase();
  const matches: PhraseMatch[] = [];

  for (const phrase of phrases) {
    const escaped = escapeRegExp(phrase);
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        phrase,
        index: match.index,
        negated: checkNegation && isNegatedBefore(textLower, match.index),
      });
    }
  }

  return matches;
}
```

---

## Migration Plan

### Phase 1: Create Shared Module (30 min)

**Task 1:** Create `text-match.utils.ts` with the API above.

**Task 2:** Write characterization tests based on existing behavior:

```typescript
// text-match.utils.spec.ts
describe('isNegatedBefore', () => {
  it('detects negation within 6 words', () => {
    expect(isNegatedBefore('i am not very interested', 17)).toBe(true);
  });

  it('ignores negation beyond 6 words', () => {
    expect(isNegatedBefore('not a b c d e f g interested', 21)).toBe(false);
  });

  it('handles "not" at phrase boundary', () => {
    expect(isNegatedBefore('not interested', 4)).toBe(true);
  });
});

describe('scanPhrases', () => {
  it('finds all matches', () => {
    const result = scanPhrases('i love hiking and hiking', ['hiking']);
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(7);
    expect(result[1].index).toBe(18);
  });

  it('detects negated matches', () => {
    const result = scanPhrases('i love hiking but not camping', ['camping']);
    expect(result[0].negated).toBe(true);
  });
});
```

---

### Phase 2: Replace in Enrichment (1 hour)

**File:** `evaluate/enrichment-v2.ts`

**Before:**
```typescript
function isNegatedBefore(haystackLower: string, matchStart: number): boolean {
  // 15 lines of local implementation
}
```

**After:**
```typescript
import { isNegatedBefore, scanPhrases } from '../shared/text-match.utils';

// Delete local implementation
// Use imported functions
```

**Verify:** Run `enrichment-v2.spec.ts` — must stay green.

---

### Phase 3: Replace in HG Extractors (2 hours)

**Files:**
- `holy-grail-matching/interest-tags-text.extract.ts`
- `lifestyle-signals-text.extract.ts`
- `personality-traits-text.extract.ts`
- `dealbreaker-signals-text.extract.ts`

**Same pattern:**
1. Import from `shared/text-match.utils`
2. Delete local `isNegatedBefore` implementation
3. Run file's spec — verify green

**IMPORTANT:** If any extractor has a **different** regex pattern, document why:

```typescript
// If lifestyle uses a 4-word window instead of 6:
import { isNegatedBefore as baseNegation } from '../shared/text-match.utils';

function isNegatedBefore(text: string, index: number): boolean {
  // Custom 4-word window for lifestyle signals (see RFC-xyz)
  return /\bnot(\s+[\w'-]+){0,4}\s*$/i.test(text.slice(0, index).trimEnd());
}
```

**Goal:** If behavior is identical, consolidate. If behavior differs, keep local + add comment explaining why.

---

### Phase 4: Update Imports & Tests (1 hour)

**Task 1:** Search for any other duplicate helpers:

```bash
rg "function escapeRegExp" --type ts
rg "function isNegated" --type ts
```

**Task 2:** If found elsewhere (not just the 5 known files), migrate those too.

**Task 3:** Run full test suite:

```bash
npm run test -- enrichment
npm run test -- interest-tags
npm run test -- lifestyle-signals
npm run test -- personality-traits
npm run test -- dealbreaker-signals
```

**Expected:** All green, zero behavior changes.

---

## Edge Cases

**What if extractors have subtly different logic?**

**Option A (Preferred):** Pick the most robust implementation, migrate all to shared, update tests to match new behavior.

**Option B (Conservative):** Keep divergent implementations local, only consolidate the identical ones. Add TODO to unify later.

**Decision rule:** If all 5 produce identical outputs on a sample corpus → consolidate. If any differ → investigate why, document, defer.

---

## Verification

**Checklist:**

- [ ] `shared/text-match.utils.ts` created with unit tests
- [ ] All 5 duplicate implementations replaced with imports
- [ ] All keyword engine tests green
- [ ] Enrichment parity tests green (Sprint 52 freeze maintained)
- [ ] No behavioral regressions

**Success metrics:**
- ~75 LOC deleted (5 copies × ~15 LOC each)
- 1 source of truth for text matching
- Future keyword engines import shared utils

---

## Follow-up

After this story:
- ✅ No more keyword helper drift
- ✅ Bugs fixed once, not 5 times
- ➡️ Ready for Story 03 (expansion config consolidation)
- ➡️ Sprint 57 enrichment modules can use shared utils immediately
