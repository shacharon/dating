# Story 01 — Delete Dead Code & Version Aliases

**Sprint:** 60  
**Effort:** 4 hours  
**Risk:** ⚡ ZERO (confirmed unused in tech scan)  
**Status:** Planned

---

## Objective

Remove dead POC code, version alias files, and retired stub implementations identified in the August 2026 technical scan.

**Behavior guarantee:** Zero impact — these files are confirmed unused or pure re-exports.

---

## Files to DELETE

### 1. Enrichment Version Aliases (pure re-exports)

```
dating-api/src/evaluate/enrichment-v3.ts      // Just re-exports V2
dating-api/src/evaluate/enrichment-v4.ts      // Just re-exports V2
```

**Current code:**
```typescript
// enrichment-v3.ts
export {
  mapEnrichmentV2FromText as mapEnrichmentV3FromText,
  buildEnrichmentSignalsV2 as buildEnrichmentSignalsV3,
} from './enrichment-v2';
```

**Why delete:** Speculative generality — no behavior difference from V2.

**Migration:** Update imports from `enrichment-v3` or `enrichment-v4` → `enrichment-v2` (or wait for Sprint 57 to consolidate).

---

### 2. POC Repository Layer (disabled stubs)

```
dating-api/src/profiles/infrastructure/prisma-user-profiles.repository.ts
dating-api/src/profiles/infrastructure/repositories/in-memory/
  ├── in-memory-user-profiles.repository.ts
  └── ...other in-memory stubs
dating-api/src/profiles/domain/users/user.types.ts  // Unused UserId alias
dating-api/src/profiles/application/dto/           // If empty/unused
```

**Current code:**
```typescript
// prisma-user-profiles.repository.ts
export class PrismaUserProfilesRepository implements UserProfilesRepository {
  async getById(_id: UserId): Promise<UserProfileRecord | null> {
    return null;  // 🔴 Permanently disabled
  }
  async upsertUser(...): Promise<UserProfileRecord> {
    throw new ServiceUnavailableException('...writes disabled...');
  }
}
```

**Why delete:** Clean architecture POC that was never completed; production uses `me-profile` + Prisma directly.

**Migration:** None needed — no production code imports these.

---

### 3. Retired HG Ranking Stubs (if safe)

```
dating-api/src/holy-grail-matching/holy-grail-candidate-ranking.ts
  // DELETE stub DTO fields: HolyGrailRankSignalBreakdown, etc.
  // KEEP filtering logic if still used
```

**Current code:**
```typescript
/** Kept for wire/DTO compatibility; unused after five-signal ranker deletion. */
export interface HolyGrailRankSignalBreakdown {
  rankScore: 0,
  rankReasons: [RETIRED_REASON],
  rankBreakdown: [],
}
```

**Why clean up:** Dead fields bloat DTOs; confuse readers.

**Migration:** Check if any API responses still serialize these fields; if yes, mark deprecated but keep; if no, delete.

---

## Tasks

### Task 1: Search for Imports (5 min)

```bash
# Verify no production code imports these
rg "from.*enrichment-v3" --type ts
rg "from.*enrichment-v4" --type ts
rg "PrismaUserProfilesRepository" --type ts
rg "InMemoryUserProfilesRepository" --type ts
rg "from.*domain/users/user.types" --type ts
```

**Expected:** Only test/seed code (safe to delete) or nothing.

---

### Task 2: Delete Files (10 min)

```bash
# Version aliases
rm dating-api/src/evaluate/enrichment-v3.ts
rm dating-api/src/evaluate/enrichment-v4.ts

# POC repositories
rm dating-api/src/profiles/infrastructure/prisma-user-profiles.repository.ts
rm -rf dating-api/src/profiles/infrastructure/repositories/in-memory/
rm dating-api/src/profiles/domain/users/user.types.ts

# Empty DTO folder (if unused)
rm -rf dating-api/src/profiles/application/dto/
```

---

### Task 3: Update Imports (if any found in Task 1)

```typescript
// BEFORE
import { mapEnrichmentV3FromText } from './enrichment-v3';

// AFTER
import { mapEnrichmentV2FromText as mapEnrichmentFromText } from './enrichment-v2';
// Or wait for Sprint 57 to rename to mapEnrichmentFromText
```

---

### Task 4: Clean HG Ranking Stubs (30 min)

**IF** no API responses use `HolyGrailRankSignalBreakdown`:

```typescript
// DELETE
export interface HolyGrailRankSignalBreakdown { ... }
const RETIRED_REASON = 'FIVE_SIGNAL_RANKER_DELETED';

// KEEP (if used)
export function filterHolyGrailCandidates(...) { ... }
```

**Verify:** Check `matches.service.ts`, `match-ranking.service.ts` for serialization.

---

### Task 5: Run Tests (15 min)

```bash
npm run test:unit
npm run test:integration

# Expect: All green (nothing depended on deleted code)
```

---

### Task 6: Update Module Imports (if needed)

Check `profiles.module.ts`, `evaluate.module.ts` for dead provider registrations:

```typescript
// DELETE if present
providers: [
  PrismaUserProfilesRepository,  // 🔴 Dead
  InMemoryUserProfilesRepository, // 🔴 Dead
]
```

---

## Verification

**Checklist:**

- [ ] `enrichment-v3.ts`, `enrichment-v4.ts` deleted
- [ ] POC repository files deleted
- [ ] No imports found (or updated to V2)
- [ ] All tests green
- [ ] LOC reduction: ~200-500 lines deleted

**Rollback:** Git revert if unexpected import found (unlikely).

---

## Follow-up

After this story:
- ✅ Reduced confusion (fewer "what is this?" files)
- ✅ Cleaner Sprint 57 merge (no V3/V4 aliases to worry about)
- ➡️ Ready for Story 02 (text utils) and Story 03 (expansion config)
