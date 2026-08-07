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

### STORY 1: Canonical Taxonomy ✅ Done
**Points:** 2  
**Owner:** Backend

**As-built:** `biking`, `camping`, `nature` inserted alphabetically into `INTEREST_CANONICAL_TAGS` (**16 → 19**); display labels in `chips-builder.ts`; specs assert set membership and not scored/signal keys. Prompt semantic guidance deferred to Story 2; overlap preferred + i18n to Story 3.

**Tasks (as-built):**
1. ✅ Add `biking`, `camping`, `nature` to `INTEREST_CANONICAL_TAGS` (alphabetical)
2. ✅ Update display allowlist (`INTEREST_LABELS`); full LLM prompt guidance → Story 2
3. ✅ Unit tests: tags present in set; still **not** in `COMPATIBILITY_SIGNAL_KEYS`

**Files (as-built):**
- `dating-api/src/extraction/extracted-interests.interface.ts`
- `dating-api/src/evaluate/chips-builder.ts`
- `dating-api/src/extraction/extracted-interests.spec.ts`

**Acceptance Criteria:**
- ✅ 3 new tags in `INTEREST_CANONICAL_TAG_SET`
- ✅ Not treated as compatibility signals

---

### STORY 2: LLM Extraction Guidance ✅ Done
**Points:** 5  
**Owner:** Backend + Prompt Engineer

**As-built:** `expansion-09-interest-guidance.ts` (SoT from `INTEREST_CANONICAL_TAGS`) wired into self/partner/relationship `INTERESTS:`; Title-Case Nature/Running examples removed; LLM `interests` → `ExtractedSignals.rawInterests` via canonical allowlist (no synonym invent / no profile-text keyword matching). Mocked EN + HE fixtures; coexistence hiking+camping+nature. Overlap preferred + i18n → Story 3; live fixtures → Story 4.

**Principle:** LLM maps free text → canonical tags semantically. NO regex keyword matching for interests.

**Prompt guidance (examples, not code rules):**

| Tag | High examples | Avoid confusing with |
|-----|---------------|----------------------|
| `biking` | "I love cycling", "mountain bike weekends", "אופניים" | gym workouts without bikes |
| `camping` | "camping trips", "tent under the stars", "קמפינג" | hotel travel only → `travel` |
| `nature` | "love nature / forests / wildlife", "טבע" | specific hike → prefer `hiking`; specific camp → `camping` |

**Tasks (as-built):**
1. ✅ Update interest extraction prompt / canonical tag list (`expansion-09-interest-guidance.ts` + 3 domain prompts)
2. ✅ Unit tests with mocked LLM: profile texts → expected tags (+ pipeline allowlist)
3. ✅ Hebrew fixtures (mocked): אופניים, קמפינג, אוהב טבע — live gate → Story 4

**Acceptance Criteria:**
- ✅ LLM-only extraction (this path; no new keyword detectors)
- ✅ Null/omit when unclear — do not invent tags
- ✅ Coexistence: can extract `hiking` + `camping` + `nature` when all present

**Files (as-built):**
- `dating-api/src/extraction/expansion-09-interest-guidance.ts`
- `dating-api/src/extraction/extraction.service.ts`
- `dating-api/src/extraction/extraction-normalization.ts`
- `dating-api/src/extraction/extraction.service.spec.ts`
- `dating-api/src/extraction/extraction-normalization.interest.spec.ts`

---

### STORY 3: Interest Overlap Chips & i18n ✅ Done
**Points:** 4  
**Owner:** Frontend + Backend

**As-built:** `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` **8 → 11** (`biking`, `camping`, `nature` appended); EN/HE/ES `interestOverlap` copy per README; picker max-2 + match-why render specs. Existing Exp-07 UI path reused — no layout rewrite. Live fixtures / rollout gate → Story 4.

**Tasks (as-built):**
1. ✅ Add `biking`, `camping`, `nature` to `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS`
2. ✅ i18n EN/HE/ES in `matches.list.browse.interestOverlap`:

| Tag | EN | HE | ES |
|-----|----|----|-----|
| `biking` | You both enjoy biking | שניכם נהנים מרכיבה על אופניים | A ambos les gusta andar en bici |
| `camping` | You both enjoy camping | שניכם נהנים מקמפינג | A ambos les gusta acampar |
| `nature` | You both love nature | שניכם אוהבים טבע | A ambos les encanta la naturaleza |

3. ✅ UI already renders `interestOverlapTags` — verified via specs
4. ✅ Tests: shared `biking`/`camping`/`nature` → chips appear

**Files (as-built):**
- `dating-api/src/matches/expansion-07-explainability.ts`
- `dating-api/src/matches/expansion-07-explainability.spec.ts`
- `dating-api/src/matches/match-explainability.spec.ts`
- `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`
- `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx`

**Acceptance Criteria:**
- ✅ Overlap chips for new tags in EN/HE/ES
- ✅ Max-2 picker still works with new preferred tags

---

### STORY 4: Testing & Validation ✅ Done
**Points:** 3  
**Owner:** QA + Backend

**As-built:** `compare()` Exp-09 interest-overlap E2E; `expansion-09-rollout.spec.ts` gate (19 tags / preferred 11 / not scored / hobby 8/8); fixtures + `npm run validate:expansion-09-extraction` (live **100%** / 4; skip without API key). Regression fixture uses explicit `gaming` wording for live reliability. No keyword interest detectors added; tags remain unscored.

**Fixtures (as-built):**

| Text | Expected tags (among others) |
|------|------------------------------|
| "I love biking and camping" | `biking`, `camping` |
| "Nature walks and forests" | `nature` (and/or `hiking` if hike-specific) |
| "אוהב אופניים וקמפינג" | `biking`, `camping` |
| "I love gaming, cooking, movies, travel, and dancing" | existing tags unchanged |

**Rollout gate:**
- [x] 19 canonical tags
- [x] Extraction fixtures pass (deterministic + live ≥85%; as-built **100%**)
- [x] Overlap chips EN/HE/ES
- [x] No regression on existing 16 tags
- [x] Still not in scored signal keys

---

## Definition of Done

- [x] All 4 stories completed
- [x] Games / Cooking / Nature / Dancing / Travelling / Biking / Camping / Movies → all covered by taxonomy
- [x] NO hardcoded pattern matching for interest detection (LLM path; legacy enrichment/HG keyword paths untouched — not expanded)
- [x] Interest tags remain separate from compatibility signals

**Sprint Expansion-09 status: Done (engineering gate).**

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
