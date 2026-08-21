# Agent Commands — Sprint 60 (Eliminate Duplication)

Quick-reference commands for AI agents executing Sprint 60 stories.

**Pipeline paste (one at a time):** also listed in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).

---

## Paste commands (Cursor)

```text
--agent -1 sprint 60 story 1
--agent 0 sprint 60 story 1
--agent 1 sprint 60 story 1
--agent 2 sprint 60 story 1
--agent 3 sprint 60 story 1

--agent -1 sprint 60 story 2
--agent 0 sprint 60 story 2
--agent 1 sprint 60 story 2
--agent 2 sprint 60 story 2
--agent 3 sprint 60 story 2

--agent -1 sprint 60 story 3
--agent 0 sprint 60 story 3
--agent 1 sprint 60 story 3
--agent 2 sprint 60 story 3
--agent 4 sprint 60 story 3
--agent 3 sprint 60 story 3
```

**Order per story:** `-1 → 0 → 1 → 2 → (4 on S3) → 3`  
**Can run in parallel with:** Sprints 57–59  
**Stories:** 01 delete dead code → 02 text utils → 03 expansion config

---

## Story 01 — Delete Dead Code

### Preflight

```bash
# Verify imports before deleting
rg "from.*enrichment-v[34]" --type ts
rg "PrismaUserProfilesRepository" --type ts
rg "InMemoryUserProfilesRepository" --type ts
```

### Execute

```bash
# Delete version aliases
rm dating-api/src/evaluate/enrichment-v3.ts
rm dating-api/src/evaluate/enrichment-v4.ts

# Delete POC repositories
rm dating-api/src/profiles/infrastructure/prisma-user-profiles.repository.ts
rm -rf dating-api/src/profiles/infrastructure/repositories/in-memory/
rm dating-api/src/profiles/domain/users/user.types.ts
rm -rf dating-api/src/profiles/application/dto/

# Verify
npm run test
```

### Success

- No files import deleted modules
- All tests green
- ~200-500 LOC removed

---

## Story 02 — Shared Text Utils

### Create Module

```bash
# Create shared folder
mkdir -p dating-api/src/shared
touch dating-api/src/shared/text-match.utils.ts
touch dating-api/src/shared/text-match.utils.spec.ts
```

### Migrate Files (in order)

1. `src/evaluate/enrichment-v2.ts`
2. `src/holy-grail-matching/interest-tags-text.extract.ts`
3. `src/holy-grail-matching/lifestyle-signals-text.extract.ts`
4. `src/holy-grail-matching/personality-traits-text.extract.ts`
5. `src/holy-grail-matching/dealbreaker-signals-text.extract.ts`

**For each file:**

```typescript
// Add import
import { isNegatedBefore, scanPhrases } from '../shared/text-match.utils';

// Delete local implementation
// - function isNegatedBefore(...)
// - function escapeRegExp(...)
// - function scanPhrases(...) if exists

// Run file's spec
npm run test -- <filename>.spec.ts
```

### Success

- 5 files use shared utils
- All keyword engine tests green
- ~75 LOC deleted

---

## Story 03 — Expansion Config

### Phase 1: Audit

```bash
# List all expansion files
ls dating-api/src/matches/expansion-*-explainability.ts

# Count (should be 15)
ls dating-api/src/matches/expansion-*-explainability.ts | wc -l
```

### Phase 2: Create Config

```bash
touch dating-api/src/matches/expansion-config.ts
touch dating-api/src/matches/expansion-config.spec.ts
touch dating-api/src/matches/expansion-explainability.ts
touch dating-api/src/matches/expansion-explainability.spec.ts
```

### Phase 3: Extract Data

**For each expansion-N-explainability.ts:**

```bash
# Extract chip keys
rg "SHADOW_CHIP_KEYS = \[" expansion-01-explainability.ts

# Extract labels (look for object with chip labels)
rg "label:" expansion-01-explainability.ts -A 1

# Cross-reference with extraction-manifest.ts for domains
rg "'expansion-01'" src/extraction/expansion-manifest.ts -A 5
```

**Build config object** in `expansion-config.ts` with extracted data.

### Phase 4: Characterization Tests

```typescript
// For each expansion, compare old vs new
import { buildExpansion01ShadowBreakdown } from './expansion-01-explainability';
import { buildShadowBreakdown } from './expansion-explainability';

it('matches expansion-01 behavior', () => {
  const signalsA = { empathy: 0.8, emotionalIntelligence: 0.7 };
  const signalsB = { empathy: 0.6, emotionalIntelligence: 0.9 };
  
  const legacy = buildExpansion01ShadowBreakdown(signalsA, signalsB);
  const current = buildShadowBreakdown('expansion-01', signalsA, signalsB);
  
  expect(current).toEqual(legacy);
});
```

**Run for all 15 expansions** before deleting old files.

### Phase 5: Update Manifests

```bash
# Update these files to use EXPANSION_REGISTRY:
code dating-api/src/matches/expansion-explainability-manifest.ts
code dating-api/src/extraction/expansion-manifest.ts
```

### Phase 6: Delete Old Files

```bash
# Verify no direct imports
rg "from.*expansion-\d+-explainability" --type ts

# Delete (only if above shows no non-manifest imports)
rm dating-api/src/matches/expansion-0{1..9}-explainability.ts
rm dating-api/src/matches/expansion-{10..15}-explainability.ts
```

### Phase 7: Integration Tests

```bash
npm run test -- expansion
npm run test -- match-explainability
npm run test -- extraction.service
```

### Success

- Config table has 15 entries
- Generic builder passes all characterization tests
- 15 old files deleted
- All tests green
- ~800 LOC removed

---

## Full Sprint Verification

### After All Stories Complete

```bash
# Full test suite
npm run test

# Check LOC reduction
git diff main --stat

# Expected removals:
# - enrichment-v3/v4 (2 files)
# - POC repos (~5 files)
# - expansion-01..15-explainability (15 files)
# Total: ~22 files, ~1000+ LOC deleted
```

### Rollback Plan

```bash
# If issues found, revert by story:
git revert <story-3-commit>  # Expansion config
git revert <story-2-commit>  # Text utils
git revert <story-1-commit>  # Dead code
```

---

## Notes for AI Agents

- **Story 01** is safe to execute anytime (zero risk)
- **Story 02** should wait for Story 01 (cleaner imports)
- **Story 03** can overlap with Sprints 57-59 (no conflicts)
- All stories are **behavior-preserving** (no product changes)
- Characterization tests are **mandatory** before deleting old code
