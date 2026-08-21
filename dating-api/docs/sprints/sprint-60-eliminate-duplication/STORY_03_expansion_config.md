# Story 03 — Consolidate Expansion Explainability Config

**Sprint:** 60  
**Effort:** 3 days  
**Risk:** ⚠️ MEDIUM (touches 15 modules, needs careful testing)  
**Status:** Planned

---

## Objective

Replace 15 near-identical `expansion-N-explainability.ts` modules with a single data-driven configuration table.

**Current problem:** Adding a new expansion signal requires:
1. Create `expansion-N-explainability.ts` (copy-paste from N-1)
2. Update `expansion-explainability-manifest.ts`
3. Create prompt block in `expansion-manifest.ts`
4. Update extraction domain mappings

**Shotgun surgery:** 4 edits across 3-4 files for each new signal.

**After this story:** 1 config object edit.

---

## Design

### New File Structure

```
dating-api/src/matches/
  ├── expansion-config.ts              // NEW: Single config table
  ├── expansion-explainability.ts      // NEW: Generic builder using config
  ├── expansion-explainability-manifest.ts  // KEEP: Thin registry
  └── expansion-01..15-explainability.ts    // DELETE (15 files)
```

### Config Schema

```typescript
// expansion-config.ts

export interface ExpansionConfig {
  readonly id: ExpansionId;
  readonly shadowChipKeys: readonly ShadowChipKey[];
  readonly chipLabels: Record<ShadowChipKey, string>;
  readonly extractionDomains: readonly ExtractionDomain[];
  readonly promptBlocks: readonly string[];
}

export const EXPANSION_REGISTRY: readonly ExpansionConfig[] = [
  {
    id: 'expansion-01',
    shadowChipKeys: ['empathy', 'emotionalIntelligence'],
    chipLabels: {
      empathy: 'Empathy & emotional connection',
      emotionalIntelligence: 'Reading emotions & social cues',
    },
    extractionDomains: ['self'],
    promptBlocks: [
      'Does the person describe themselves as empathetic...',
      'Look for mentions of emotional awareness...',
    ],
  },
  {
    id: 'expansion-02',
    shadowChipKeys: ['careerAmbition'],
    chipLabels: {
      careerAmbition: 'Career ambition & professional drive',
    },
    extractionDomains: ['self', 'partner'],
    promptBlocks: [
      'Rate career ambition based on mentions of professional goals...',
    ],
  },
  // ... expansion-03 through expansion-15
] as const;
```

---

### Generic Builder

```typescript
// expansion-explainability.ts

import { EXPANSION_REGISTRY } from './expansion-config';

export function buildShadowBreakdown(
  expansionId: ExpansionId,
  signalsA: EnrichedSignals,
  signalsB: EnrichedSignals,
): ShadowChipBreakdown[] {
  const config = EXPANSION_REGISTRY.find(e => e.id === expansionId);
  if (!config) return [];

  return config.shadowChipKeys
    .filter(key => signalsA[key] != null && signalsB[key] != null)
    .map(key => ({
      shadowChipKey: key,
      label: config.chipLabels[key],
      scoreA: signalsA[key]!,
      scoreB: signalsB[key]!,
    }));
}

export function isExpansionShadowChipKey(
  expansionId: ExpansionId,
  key: string,
): key is ShadowChipKey {
  const config = EXPANSION_REGISTRY.find(e => e.id === expansionId);
  return config?.shadowChipKeys.includes(key as any) ?? false;
}
```

---

## Migration Plan

### Phase 1: Create Config Table (4 hours)

**Task 1:** Extract data from all 15 `expansion-N-explainability.ts` files:

```bash
# Audit existing expansions
ls src/matches/expansion-*-explainability.ts

# For each file, extract:
# - SHADOW_CHIP_KEYS
# - Chip labels
# - Domains (from extraction-manifest.ts)
# - Prompt blocks (from expansion-manifest.ts)
```

**Task 2:** Create `expansion-config.ts` with `EXPANSION_REGISTRY` table.

**Task 3:** Write validation tests:

```typescript
// expansion-config.spec.ts
describe('EXPANSION_REGISTRY', () => {
  it('has 15 expansions', () => {
    expect(EXPANSION_REGISTRY).toHaveLength(15);
  });

  it('has unique IDs', () => {
    const ids = EXPANSION_REGISTRY.map(e => e.id);
    expect(new Set(ids).size).toBe(15);
  });

  it('all chip keys have labels', () => {
    EXPANSION_REGISTRY.forEach(config => {
      config.shadowChipKeys.forEach(key => {
        expect(config.chipLabels[key]).toBeDefined();
        expect(config.chipLabels[key].length).toBeGreaterThan(0);
      });
    });
  });
});
```

---

### Phase 2: Create Generic Builder (2 hours)

**Task 1:** Implement `buildShadowBreakdown` and `isExpansionShadowChipKey` (see Design section).

**Task 2:** Write characterization tests comparing old vs new:

```typescript
// expansion-explainability.spec.ts
import { buildExpansion01ShadowBreakdown } from './expansion-01-explainability';
import { buildShadowBreakdown } from './expansion-explainability';

describe('buildShadowBreakdown', () => {
  it('matches expansion-01 legacy behavior', () => {
    const signalsA = { empathy: 0.8, emotionalIntelligence: 0.7 };
    const signalsB = { empathy: 0.6, emotionalIntelligence: 0.9 };

    const legacy = buildExpansion01ShadowBreakdown(signalsA, signalsB);
    const newImpl = buildShadowBreakdown('expansion-01', signalsA, signalsB);

    expect(newImpl).toEqual(legacy);
  });

  // Repeat for all 15 expansions...
});
```

---

### Phase 3: Update Manifests (2 hours)

**File:** `expansion-explainability-manifest.ts`

**Before:**
```typescript
import { buildExpansion01ShadowBreakdown } from './expansion-01-explainability';
import { buildExpansion02ShadowBreakdown } from './expansion-02-explainability';
// ... 13 more imports

export const EXPANSION_EXPLAINABILITY_REGISTRY = {
  'expansion-01': { build: buildExpansion01ShadowBreakdown },
  'expansion-02': { build: buildExpansion02ShadowBreakdown },
  // ... 13 more
};
```

**After:**
```typescript
import { buildShadowBreakdown } from './expansion-explainability';
import { EXPANSION_REGISTRY } from './expansion-config';

export const EXPANSION_EXPLAINABILITY_REGISTRY = Object.fromEntries(
  EXPANSION_REGISTRY.map(config => [
    config.id,
    { build: (a, b) => buildShadowBreakdown(config.id, a, b) },
  ]),
);
```

---

**File:** `extraction/expansion-manifest.ts`

**Before:**
```typescript
export const EXPANSION_MANIFEST: ExpansionManifest = {
  'expansion-01': {
    domains: ['self'],
    promptBlocks: ['Does the person...'],
  },
  'expansion-02': { ... },
  // ... manual duplication
};
```

**After:**
```typescript
import { EXPANSION_REGISTRY } from '../matches/expansion-config';

export const EXPANSION_MANIFEST: ExpansionManifest = Object.fromEntries(
  EXPANSION_REGISTRY.map(config => [
    config.id,
    {
      domains: config.extractionDomains,
      promptBlocks: config.promptBlocks,
    },
  ]),
);
```

---

### Phase 4: Delete Old Files (1 hour)

**Task 1:** Verify no direct imports of `expansion-N-explainability.ts`:

```bash
rg "from.*expansion-\d+-explainability" --type ts
# Expect: Only manifest files (which we already updated)
```

**Task 2:** Delete 15 files:

```bash
rm src/matches/expansion-01-explainability.ts
rm src/matches/expansion-02-explainability.ts
# ... through expansion-15
```

**Task 3:** Run tests:

```bash
npm run test -- expansion
npm run test -- match-explainability
npm run test -- extraction
```

**Expected:** All green — behavior preserved via config table.

---

### Phase 5: Integration Tests (4 hours)

**Task 1:** Run full match explainability suite:

```bash
npm run test -- match-explainability.spec.ts
```

**Task 2:** Smoke test each expansion in isolation:

```typescript
// expansion-config.integration.spec.ts
describe('Expansion config integration', () => {
  EXPANSION_REGISTRY.forEach(config => {
    it(`expansion ${config.id} builds chips correctly`, () => {
      const signalsA = Object.fromEntries(
        config.shadowChipKeys.map(k => [k, 0.8]),
      );
      const signalsB = Object.fromEntries(
        config.shadowChipKeys.map(k => [k, 0.6]),
      );

      const breakdown = buildShadowBreakdown(config.id, signalsA, signalsB);
      expect(breakdown.length).toBe(config.shadowChipKeys.length);
      breakdown.forEach(chip => {
        expect(chip.label).toBe(config.chipLabels[chip.shadowChipKey]);
      });
    });
  });
});
```

**Task 3:** Manual QA (if applicable):
- Run match list for test user
- Verify chip labels render correctly
- Check no missing/broken expansions

---

## Edge Cases

### What if an expansion has custom logic?

**Example:** `expansion-07` might filter chips based on score thresholds, not just presence.

**Solution:**

```typescript
// expansion-config.ts
export interface ExpansionConfig {
  // ... existing fields
  readonly customBuilder?: (a: EnrichedSignals, b: EnrichedSignals) => ShadowChipBreakdown[];
}

// expansion-explainability.ts
export function buildShadowBreakdown(expansionId, signalsA, signalsB) {
  const config = EXPANSION_REGISTRY.find(e => e.id === expansionId);
  
  // Use custom builder if exists
  if (config.customBuilder) {
    return config.customBuilder(signalsA, signalsB);
  }
  
  // Otherwise, generic builder
  return config.shadowChipKeys.map(...);
}
```

**Prefer:** Keep 80% in config, allow 20% custom escape hatch.

---

## Verification

**Checklist:**

- [ ] `expansion-config.ts` created with 15 entries
- [ ] Generic `buildShadowBreakdown` matches all legacy behavior
- [ ] Both manifests updated to use config
- [ ] 15 old explainability files deleted
- [ ] All expansion tests green
- [ ] Match explainability integration tests green
- [ ] Extraction manifest still generates correct prompts

**Success metrics:**
- ~800 LOC deleted (15 files × ~50 LOC each)
- New expansion = 1 config object, not 4 file edits
- Zero behavior regressions

---

## Follow-up

After this story:
- ✅ Expansion maintenance 4× faster (1 edit vs 4)
- ✅ No more copy-paste errors
- ✅ Config-driven = easier to generate from DB/CMS later
- ➡️ Pattern can be applied to enrichment modules (Sprint 57 synergy)
- ➡️ Ready for Phase 3 (DIP ports) and Phase 4 (repositories)
