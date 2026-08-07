# Sprint Expansion-09: Interest Taxonomy Gaps

**Duration:** 1 week (small sprint)  
**Goal:** Add missing interest tags — `biking`, `camping`, `nature` — so common hobbies extract and show in "why we matched"  
**Depends on:** Sprint Expansion-07 interest overlap chips (already live)  
**Milestone:** 19 canonical interest tags (16 → 19) + i18n overlap chips

**CRITICAL: LLM-FIRST EXTRACTION - NO HARDCODED PATTERNS**

Read first: `docs/sprints/LLM_FIRST_PRINCIPLE.md`

These are **interest tags**, not compatibility signals. Do **not** add them to `SignalKey` / `COMPATIBILITY_SIGNAL_KEYS`.

---

## Why This Sprint Exists

User-facing hobby list check (Aug 2026):

| Hobby | Status before Sprint 09 |
|-------|-------------------------|
| Games | ✅ `gaming` |
| Cooking | ✅ `cooking` |
| Nature | ❌ missing (closest: `hiking` / `beach`) |
| Dancing | ✅ `dancing` |
| Travelling | ✅ `travel` |
| Biking | ❌ missing |
| Camping | ❌ missing |
| Movies | ✅ `movies` |

Without these tags, LLM output is dropped or forced into wrong tags → no shared-interest chips for biking/camping/nature lovers.

---

## Tags Added

| Tag | Meaning | Distinctions |
|-----|---------|--------------|
| `biking` | Cycling / bike rides (road, mountain, casual) | ≠ `gym` (general fitness); ≠ `hiking` (on foot) |
| `camping` | Overnight outdoor camping / tenting | ≠ `hiking` (day walk); ≠ `travel` (general travel) |
| `nature` | Nature appreciation / outdoors broadly (parks, forests, wildlife) | Broader than `hiking`; use when outdoors love is clear but not specifically hike/camp/bike |

**After:** `INTEREST_CANONICAL_TAGS` length = **19** (was 16).

---

## Stories

### STORY 1: Canonical Taxonomy
**Points:** 2  
**Owner:** Backend

**Tasks:**
1. Add `biking`, `camping`, `nature` to `INTEREST_CANONICAL_TAGS` in `extracted-interests.interface.ts` (alphabetically or append consistently with existing style)
2. Update any allowlist / prompt guidance that enumerates canonical tags
3. Unit tests: tags present in set; still **not** in `COMPATIBILITY_SIGNAL_KEYS`

**Files:**
- `dating-api/src/extraction/extracted-interests.interface.ts`
- Extraction prompt / interests schema docs if they hard-list tags
- Related specs

**Acceptance Criteria:**
- ✅ 3 new tags in `INTEREST_CANONICAL_TAG_SET`
- ✅ Not treated as compatibility signals

---

### STORY 2: LLM Extraction Guidance
**Points:** 5  
**Owner:** Backend + Prompt Engineer

**Principle:** LLM maps free text → canonical tags semantically. NO regex keyword matching for interests.

**Prompt guidance (examples, not code rules):**

| Tag | High examples | Avoid confusing with |
|-----|---------------|----------------------|
| `biking` | "I love cycling", "mountain bike weekends", "אופניים" | gym workouts without bikes |
| `camping` | "camping trips", "tent under the stars", "קמפינג" | hotel travel only → `travel` |
| `nature` | "love nature / forests / wildlife", "טבע" | specific hike → prefer `hiking`; specific camp → `camping` |

**Tasks:**
1. Update interest extraction prompt / canonical tag list in extraction service
2. Unit tests with mocked LLM: profile texts → expected tags
3. Hebrew fixtures: אופניים, קמפינג, אוהב טבע

**Acceptance Criteria:**
- ✅ LLM-only extraction
- ✅ Null/omit when unclear — do not invent tags
- ✅ Coexistence: can extract `hiking` + `camping` + `nature` when all present

**Files:**
- `dating-api/src/extraction/extraction.service.ts` (or interests prompt module)
- Specs

---

### STORY 3: Interest Overlap Chips & i18n
**Points:** 4  
**Owner:** Frontend + Backend

**Tasks:**
1. Add `biking`, `camping`, `nature` to `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` in `expansion-07-explainability.ts`
2. i18n EN/HE/ES in `matches.list.browse.interestOverlap`:

| Tag | EN | HE | ES |
|-----|----|----|-----|
| `biking` | You both enjoy biking | שניכם נהנים מרכיבה על אופניים | A ambos les gusta andar en bici |
| `camping` | You both enjoy camping | שניכם נהנים מקמפינג | A ambos les gusta acampar |
| `nature` | You both love nature | שניכם אוהבים טבע | A ambos les encanta la naturaleza |

3. UI already renders `interestOverlapTags` — verify new tags display
4. Tests: shared `biking`/`camping`/`nature` → chips appear

**Files:**
- `dating-api/src/matches/expansion-07-explainability.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`
- `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` (if needed)

**Acceptance Criteria:**
- ✅ Overlap chips for new tags in EN/HE/ES
- ✅ Max-2 picker still works with new preferred tags

---

### STORY 4: Testing & Validation
**Points:** 3  
**Owner:** QA + Backend

**Fixtures:**

| Text | Expected tags (among others) |
|------|------------------------------|
| "I love biking and camping" | `biking`, `camping` |
| "Nature walks and forests" | `nature` (and/or `hiking` if hike-specific) |
| "אוהב אופניים וקמפינג" | `biking`, `camping` |
| "Games, cooking, movies, travel, dancing" | existing tags unchanged |

**Rollout gate:**
- [ ] 19 canonical tags
- [ ] Extraction fixtures pass
- [ ] Overlap chips EN/HE/ES
- [ ] No regression on existing 16 tags
- [ ] Still not in scored signal keys

---

## Definition of Done

- [ ] All 4 stories completed
- [ ] Games / Cooking / Nature / Dancing / Travelling / Biking / Camping / Movies → all covered by taxonomy
- [ ] NO hardcoded pattern matching for interest detection
- [ ] Interest tags remain separate from compatibility signals

---

## Coverage After This Sprint

| Hobby | Tag |
|-------|-----|
| Games | `gaming` |
| Cooking | `cooking` |
| Nature | `nature` |
| Dancing | `dancing` |
| Travelling | `travel` |
| Biking | `biking` |
| Camping | `camping` |
| Movies | `movies` |

**8 / 8 covered.**

---

## Agent Commands

See `docs/sprints/EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-09 section.
