# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_cap_candidate_pool.md](../../STORY_04_cap_candidate_pool.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Greenfield stopgap on `buildFullRankedList` hydrate. Skip Agent 4 (unit specs; no HTTP DTO field add/remove).

---

## Summary

- Cap list-rebuild `findMany` with env **`MATCH_LIST_CANDIDATE_CAP`** (default **1000**) after Story 2 SQL prefilter + photo where.
- Order hydrate by **`analyzedAt DESC`, then `id ASC`**; null `analyzedAt` last.
- Product score sort unchanged (post-score). Redis still caches the full ranked result of the rebuild (now ≤ cap after filters).
- Fix telemetry so **cap truncation is not folded into `filteredNoPhotoCandidates`**: add uncapped eligible `count` on the same where; log hydrated vs eligible vs cap.
- Document temporary until async materialization.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.service.ts` | `orderBy` + `take` on list `findMany`; env helper; eligible count; log fields |
| `dating-api/.env.example` | Document `MATCH_LIST_CANDIDATE_CAP` |
| `me-matches.service.spec.ts` | Cap=2 → `take: 2` + orderBy asserted; scoring only sees 2 rows |
| Config module (optional) | Inline `process.env` parse OK if matches nearby patterns; small helper preferred |

---

## Decisions (do not reverse without discussion)

### 1. Env + default (locked)

| Item | Value |
|------|--------|
| Name | `MATCH_LIST_CANDIDATE_CAP` |
| Default | **1000** when unset, empty, non-finite, or **&lt; 1** (including `0`) |
| Unlimited | **Not supported** in this stopgap (always capped) |

Parse once per rebuild (or module-level helper). Comment: temporary until async match materialization.

### 2. Where the cap applies (locked)

On **`buildFullRankedList` → `userProfile.findMany` only**:

```ts
where: matchCandidatePhotoEligibleWhere(...)  // photo + Story 2 gender/age
orderBy: [{ analyzedAt: 'desc' }, { id: 'asc' }]
take: cap
select: candidateSelectList
```

- Cap **after** SQL prefilter (do not cap on base-only where).
- Do **not** change `getById` / assert paths.
- Do **not** change product sort after scoring (eligible first, `matchScore` DESC, `id`).

### 3. Null `analyzedAt` (locked)

Ensure nulls do **not** consume the cap ahead of dated rows. Prefer Prisma:

```ts
orderBy: [
  { analyzedAt: { sort: 'desc', nulls: 'last' } },
  { id: 'asc' },
]
```

If Prisma client version rejects `nulls`, use equivalent raw/`NULLS LAST` — do not ship NULLS FIRST.

### 4. Cache + pagination (locked)

- Redis still stores the **entire ranked array** produced by the rebuild (smaller when capped).
- Cursor pagination over that array unchanged.
- Client `hasMore` means “more in this rebuild,” not “more eligible in DB.” Document in `.env.example` / service comment — no DTO change required.

### 5. Client / telemetry semantics (locked — no silent lie)

Today: `filteredNoPhotoCandidates = baseCount - hydrated` already includes gender/age (Story 2 drift) and would **also absorb cap truncation** if left unchanged.

**This story:**

| Field / log | Meaning |
|-------------|---------|
| `count(matchCandidateBaseWhere)` | Unchanged — base ANALYZED pool |
| **New** `count(same photo+prefilter where, no take)` | `candidatesEligible` (uncapped) |
| `findMany` … `take: cap` | Hydrated rows |
| `totalCandidatesBeforeFilter` (API) | **`candidateRows.length`** (hydrated ≤ cap) — what entered the in-memory loop |
| `filteredNoPhotoCandidates` (API) | **`baseCount - candidatesEligible`** — must **not** use hydrated length (cap must not inflate this) |
| Trace/log | Include `candidatesHydrated`, `candidatesEligible`, `cap` |

Do **not** add new response DTO keys this story (Story 05 owns richer metrics). Keep existing two API fields with the fixed formulas above.

### 6. Fairness (accepted stopgap)

Hydrate bias = recently analyzed. Older profiles may be invisible on browse while pool ≫ cap. Existing LIKE/mutual hard-blocked outside the cap may drop from list. Document as temporary; materialization is the real fix.

### 7. Tests (Agent 1)

- Helper/env: default 1000; `0`/`-1`/`abc` → 1000; `2` → 2.
- `findMany` called with `take: 2` and locked `orderBy` when env=2.
- With 5 candidate fixtures and cap=2, at most 2 enter scoring / appear in ranked list (mock findMany returning 2 rows is enough if call args assert take).
- Existing pagination / gender tests still pass (mocks may need to ignore new count).

### 8. Agent 4

- **Skip.**

---

## Out of scope

- Story 05 custom metrics / renaming `filteredNoPhotoCandidates`  
- Changing list query `limit` (page size)  
- Cap on detail  
- Async materialization / fair sampling  

---

## Agent 1 instructions

1. Add `resolveMatchListCandidateCap()` (or equivalent) + wire `orderBy`/`take` on list `findMany`.
2. Parallelize: base `count`, eligible `count` (photo+prefilter, no take), capped `findMany`.
3. Fix `filteredNoPhotoCandidates` / `totalCandidatesBeforeFilter` per §5; enrich list trace.
4. `.env.example` one-liner; service comment (temporary).
5. Specs; `npm run build`; commit; `agent-1-dev.md`.

Suggested commit message:

```
perf(matches): cap match-list candidate hydrate on cache miss

Add MATCH_LIST_CANDIDATE_CAP (default 1000) with analyzedAt ordering
as a stopgap until async match materialization.

Sprint 27 Story 4
```

---

## Agent 2 instructions

- [ ] Cap after photo + Story 2 prefilter; default 1000; `0` → default
- [ ] Deterministic orderBy; nulls last
- [ ] `filteredNoPhotoCandidates` not inflated by cap
- [ ] No product-sort change; no detail cap
- [ ] `.env.example` documents temporary stopgap
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Note fairness stopgap in PM notes.
- Write `agent-3-pm.md`.

---

## Open risks

1. Extra eligible `count` per miss — cheap vs unbounded hydrate; keep it.  
2. Prisma `nulls: 'last'` support — verify at implement time.  
3. Hard-blocked existing outside top-N by `analyzedAt` may vanish from list until materialization.
