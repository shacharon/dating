# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_existing_match_hard_block_reasons.md](../../STORY_01_existing_match_hard_block_reasons.md)  
**Sprint:** sprint-18-existing-match-hard-block-visibility  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- When HG hard FAIL would omit a candidate, **keep them on the list if “existing”** for this viewer; attach `hardBlocked` with 1..n reasons (quotes when available).
- **New** hard FAILs stay omitted (Sprint 17 unchanged).
- **No Prisma migration.** Existing = durable signals we already have (`MatchAction.LIKE` and/or active `MutualMatch`).
- Soft ranking out of scope. Viewer-only (do not disable counterparty globally).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.service.ts` | updated — branch on FAIL: existing → push + `hardBlocked`; else `continue` |
| `dating-api/src/holy-grail-matching/hard-block-reasons.ts` (new) | create — pure builder: FAIL dims → reasons + evidence join |
| `dating-api/src/me-profile/me-matches.service.ts` (`MeMatchItemDto` / detail) | updated — `hardBlocked?` |
| `dating-ui/src/lib/me-profile-api.ts` | updated — mirror DTO |
| `dating-ui/src/app/dating/me-matches/page.tsx` (+ detail) | updated — disabled card + reasons + i18n |
| `dating-ui/src/lib/i18n/{types,en,es,he}.ts` | updated — hard-block copy |
| E2E sibling under `me-profile/` | create — existing vs new |
| Prisma | **N/A — no migration** |

---

## Decisions (do not reverse without discussion)

### 1. “Existing” definition — locked

A candidate is **existing** for viewer `V` if **either**:

1. `MatchAction` where `actorUserId = V` and `targetUserId = candidate.userId` and `action = LIKE`, **or**
2. There is an **ACTIVE** `MutualMatch` involving `V` and the candidate (covers mutual + conversation thread).

**Not** existing (hard FAIL → still **omit**):

- No action / never liked  
- `PASS` only (they chose pass; do not resurrect as a disabled warning card)  
- `BLOCK` (keep omitting BLOCK regardless)  
- “Was shown in list once” — **no impression table**; do not invent one this story  

Rationale: LIKE / mutual are durable user-visible relationships; PASS/BLOCK and anonymous browse are not.

### 2. List sort — locked

- Eligible matches: current sort (`matchScore` DESC, nulls last).  
- **Hard-blocked existing** rows: **append after** eligible matches (bottom of the same `matches` array).  
- No separate API section this story (UI can still label them).

### 3. Liked chip — locked

- Keep `yourAction: 'LIKE'` visible (Liked chip).  
- Add disabled / “No longer a match” treatment on top — **do not** invent a Closed bucket this story.

### 4. Message composition — locked

API returns:

- `code`, `dimension`, `direction` (`viewer_to_them` | `them_to_viewer`), optional `evidence` quotes  
- Plus English `message` for E2E / non-i18n clients  

UI **prefers** i18n templates from `code` + quotes; falls back to `message` if unknown code.

### 5. Which FAILs become reasons — locked (v1)

Emit a reason for every **FAIL** that contributed to overall hard FAIL in **either** direction (`aToB` / `bToA`):

| Source | Dimension key | Evidence |
|--------|---------------|----------|
| `dealbreakerDimensions[tag].status === 'FAIL'` | tag (e.g. `smoking`) | viewer: matching `DealbreakerSignal.evidence`; counterparty: `SelfFactHint.evidence` when present (column-only → omit counterparty quote) |
| Fixed `GENDER` / `AGE` / `PROXIMITY` FAIL | `GENDER` / `AGE` / `PROXIMITY` | no free-text quotes (message from `reasonCode` only) |

Deduplicate by `(direction, dimension, code)`.

### 6. Detail endpoint — locked

`getById` today 404s on HG FAIL. For **existing** hard-blocked candidates: return **200** with same `hardBlocked` payload (and scores if compare still runs; scores optional/null OK). Non-existing FAIL → keep 404.

Like/Pass on disabled: UI disables primary Like CTA; API may still accept actions (no auto-PASS). Optional follow-up: reject new LIKE with 422 — **out of scope** unless trivial.

### 7. No auto-unmatch / notify / soft ranking

Unchanged from story out-of-scope.

### 8. Prisma / persistence

**No migration.** Recompute on each list/detail read (same extract-at-read as Sprint 17).

---

## API contract (copy-paste)

```ts
export type HardBlockDirection = 'viewer_to_them' | 'them_to_viewer';

export type HardBlockReasonDto = {
  code: string; // e.g. DB_SMOKING_EXCLUDED_TRAIT_PRESENT | GENDER_NOT_IN_ALLOWLIST
  dimension: string; // smoking | GENDER | AGE | ...
  direction: HardBlockDirection;
  message: string; // English one-liner
  evidence?: {
    viewerQuote?: string;
    counterpartyQuote?: string;
  };
};

export type HardBlockedDto = {
  disabled: true;
  reasons: HardBlockReasonDto[]; // length >= 1
};

// On MeMatchItemDto (+ detail as applicable):
hardBlocked?: HardBlockedDto; // absent when eligible
```

List behavior:

```
if hg FAIL:
  if isExisting(viewer, candidate):  // LIKE or ACTIVE MutualMatch
    push item with hardBlocked (skip or still compute score — prefer still compute for continuity)
  else:
    continue  // omit
```

MutualMatch batch: load active mutuals for viewer once per list (avoid N+1), e.g. `findMany` where userId1/userId2 = viewer and status ACTIVE → Set of counterpart userIds.

---

## Service signatures

```ts
// hard-block-reasons.ts
export function buildHardBlockReasons(input: {
  aToB: HolyGrailDirectionalEvaluationResult;
  bToA: HolyGrailDirectionalEvaluationResult;
  viewerSignals: readonly DealbreakerSignal[];      // post-guardrail
  counterpartySelfHints: readonly SelfFactHint[]; // from extractSelfFactHintsFromFreeText
}): HardBlockReasonDto[];

export function isExistingHardBlockCandidate(input: {
  yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
  hasActiveMutual: boolean;
}): boolean; // true iff LIKE or hasActiveMutual
```

Wire inside `MeMatchesService.list` / `getById` after `evaluateHolyGrailPairDirections`.

---

## Migration plan

- Forward / backfill / rollback: **N/A** (behavior-only)

---

## Integration points

| Component | Action |
|-----------|--------|
| `MeMatchesService.list` | Branch FAIL; batch mutuals; attach `hardBlocked` |
| `MeMatchesService.getById` | 200 + `hardBlocked` when existing |
| `hard-block-reasons.ts` | Pure reason builder |
| dating-ui me-matches list + detail | Disabled UI + reasons + i18n |
| Soft ranking / compareWithStatus ranking | **Do not reconnect** |

---

## Runtime topology

N/A — REST only.

---

## E2E verification plan

**Affects:** eligibility **presentation** (list inclusion when existing) — not ranking order of eligible matches (blocked sort to bottom only).

| Item | Plan |
|------|------|
| Baseline keep green | Sprint 16/17 `me-new-model-e2e*.integration.spec.ts` + dealbreaker specs — **unmodified** assertions for “new” omit behavior |
| New scenarios (Agent 4) | New sibling e.g. `me-new-model-e2e-hard-block-existing.integration.spec.ts` |
| Scenario A | Searcher hard “don’t want smokers”; counterparty silent → appears; patch counterparty `I smoke` **without** LIKE → **omitted** (new) |
| Scenario B | Same pair but searcher **LIKEd** while eligible, then counterparty `I smoke` → **included**, `hardBlocked.disabled === true`, reasons include smoking + quotes |
| Scenario C | Soft / no LIKE / FAIL → still omitted |
| Agent 4 | **Required** after agent 2 |

---

## Tests / verification (for agent 1)

- [ ] Unit: `buildHardBlockReasons` multi-reason + both directions + missing quotes
- [ ] Unit: `isExistingHardBlockCandidate` matrix (LIKE / mutual / PASS / null)
- [ ] List: existing FAIL kept; new FAIL omitted; blocked sort after eligible
- [ ] Detail: existing FAIL → 200 + hardBlocked
- [ ] UI i18n en/es/he
- [ ] `prisma migrate deploy`: **N/A**
- [ ] Browser Network: N/A

---

## Open questions / blockers

Product Qs from story draft — **locked above**. Re-open only if product rejects:

1. Existing = LIKE **or** active MutualMatch (not PASS, not impression)  
2. Sort = bottom of list  
3. Keep Liked chip + disabled  
4. API `message` (EN) + UI i18n from `code`/quotes  

---

## Next agent

```text
--agent 1 sprint 18 story 1
```

**Notes for next agent:**

- Change the HG FAIL `continue` in `list` / 404 in `getById` only for existing.
- Reuse extract/guardrails; never invent impression storage.
- After CR → `--agent 4 sprint 18 story 1` (required).
