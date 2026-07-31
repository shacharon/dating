# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_fallback_human.md](../../STORY_04_fallback_human.md)  
**Sprint:** sprint-23-human-match-copy  
**Date:** 2026-07-31  
**Status:** complete  

---

## Summary

- Close the last **chip-soup / blank** holes on list + detail degrade paths. Most builders already exist (Story 1 TLDR band lines, Story 2–3 evidence-first fallback, cache-only-on-LLM).
- **Primary gap:** user-facing UI still falls back to `explainability.reasonShort` (chip labels like `Ambition alignment`) when takeaway/narrative is missing. Stop that on list + detail prose.
- Verify / harden: thin-chip list TLDR, detail fallback ignores excerpts + labels, failed LLM never cached. **No `v5` bump. Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/.../me-matches/page.tsx` | design — list copy = `primaryTakeaway` **only** (never `reasonShort`) |
| `dating-ui/.../me-matches/[id]/match-detail-prose.ts` | design — short fallback = `primaryTakeaway` **only** (never `reasonShort`) |
| `dating-ui` list + detail prose specs | design — chip jargon must not surface via reasonShort fallback |
| `dating-api/.../match-list-tldr.ts` | verify — band lines for 0 / unknown chips; tiny harden if any hole |
| `dating-api/.../match-narrative-fallback.ts` | verify — evidence-first; no labels; ignore `profileExcerpts`; optional thin-pack sentence |
| `dating-api/.../match-narrative.generator.ts` + specs | verify — fluff → fallback, no chip labels |
| `dating-api/.../me-matches.service.ts` + spec | verify — upsert only when `source === 'llm'` (existing) |
| Shared test helper (optional) | design — `assertNoChipLabels(text)` over `Object.keys(CHIP_TO_TRAIT)` |
| Prisma / scoring / `MATCH_NARRATIVE_PROMPT_VERSION` / cache key shape | **no change** (stay **`v4`**) |

---

## Decisions (do not reverse without discussion)

### 1. No prompt / cache version bump

- Keep `MATCH_NARRATIVE_PROMPT_VERSION = 'v4'`.
- Cache key shape unchanged. This story does not change LLM contract.

### 2. User-facing surfaces never show `reasonShort` (locked)

`reasonShort` may still embed chip labels (admin / audit / older clients — Story 1 lock). **Product UI must not use it** as a user-visible degrade path.

**List** (`me-matches/page.tsx`) — change from:

```tsx
m.recommendation?.primaryTakeaway?.trim() || m.explainability?.reasonShort
```

to:

```tsx
m.recommendation?.primaryTakeaway?.trim()
```

- If takeaway missing → **omit** the subtitle (do not invent client-side copy; live API always sets takeaway via `buildMatchRecommendation` / `buildPlainMatchListTldr`).
- Still never render `matchNarrative` on list.

**Detail prose** (`match-detail-prose.ts`) — when `matchNarrative` empty:

```ts
const short = data.recommendation?.primaryTakeaway?.trim() || '';
```

- Do **not** fall through to `reasonShort`.
- Prefer narrative (LLM or structured fallback string from API). Short takeaway only if narrative absent (e.g. no-score / hard-block edge).

### 3. List TLDR thin path (already locked — verify)

`buildPlainMatchListTldr`:

| Chips → phrases | Line |
|-----------------|------|
| ≥2 known | `You both share ${p1} and ${p2}.` |
| 1 known | `Clear overlap: ${p1}.` |
| 0 known (empty **or** all unknown) | band line by `finalScore` |

Band lines (keep exact unless a hole forces tweak):

- `≥ 60` → `Some real overlap — open to see why.`
- `≥ 40` → `A few touchpoints — open to see why.`
- else → `Limited overlap — open only if curious.`

Invariants:

- Output never contains any `CHIP_TO_TRAIT` key as substring (case-insensitive).
- No LLM. No `about*`. No `%` / “compatibility” in templates.

Agent 1: add/confirm test **unknown chips only** → band line (not empty, not chip names).

### 4. Detail `buildFallbackMatchNarrative` (verify + minimal harden)

Keep current behavior:

1. Band opener → up to 5 **evidence** sentences (never `trait.label` / chip keys).
2. Shared interest note / interests (plain).
3. `tensionNoteFromChip` (scrubbed) — never raw tension chip label.
4. Caution if present and not banned.
5. `nextActionForLlm` or band closer.
6. **Must ignore** `profileExcerpts` / raw about\* (Story 3 lock — reconfirm with secret-blob fixture).

**Thin pack (0 traits):** opener + closer (and optional interest/tension if any) is enough — must be non-empty. Optional Agent 1 one-liner if output feels too thin:

- e.g. `There isn't enough structured signal yet for a longer read.` between opener and closer — **only if** traits length === 0; do not invent biography.

Do **not** join `positiveChips` or print chip labels.

### 5. Failed LLM never cached (reconfirm)

`MeMatchesService.resolveMatchNarrative`:

```ts
if (generated.source === 'llm') {
  await this.matchNarrativeCache.upsert(...);
}
// fallback: return narrative, no upsert
```

Agent 1: keep / extend unit test `getById() caches LLM narrative but not fallback`.

Generator: validate fail / throw → `source: 'fallback'` → same path.

### 6. Shared chip-label assert (optional but preferred)

Small helper used by list TLDR + fallback (+ UI) specs:

```ts
export function textContainsChipLabel(text: string): string | null
// returns first CHIP_TO_TRAIT key found (case-insensitive), else null
```

Place next to `CHIP_TO_TRAIT` or in `match-list-tldr.ts` / test util. DoD fixture: **no user-visible fallback contains `Ambition alignment`**.

### 7. Untouched

- Scoring / HG / ranking / blend weights.
- Prisma schema.
- HTTP DTO field names (`primaryTakeaway`, `matchNarrative`, `reasonShort` still on wire).
- List LLM (none). Phase 3 excerpt wiring (stay detail-only).
- Admin / engine `reasonShort` generation (may still say chip names — not user UI).

---

## API contract

**No new fields.** Semantics: list/detail UI ignore `reasonShort` for display. Wire may still include it.

---

## Service signatures

```ts
// unchanged
buildPlainMatchListTldr({ finalScore, positiveChips }): string  // always non-empty human line
buildFallbackMatchNarrative(factPack): string                 // never blank; no chip labels; no excerpts
MatchNarrativeGenerator.generate → { source: 'llm' | 'fallback', narrative, promptVersion: 'v4' }

// UI
// list subtitle ← primaryTakeaway only
// resolveDetailProse ← narrative || primaryTakeaway only
```

---

## Migration plan

**N/A.** Rollback = restore reasonShort UI fallbacks (not desired).

---

## Integration points

| Component | Action |
|-----------|--------|
| List UI | Drop `reasonShort` display fallback |
| Detail prose helper | Drop `reasonShort` display fallback |
| `match-list-tldr` | Verify thin / unknown → band; add tests |
| `match-narrative-fallback` | Verify + optional thin-pack sentence |
| Generator + me-matches cache | Reconfirm fail → human, no cache |
| Specs API + UI | Chip-label free; Phase 3 secret blob; fluff → fallback |

---

## Runtime topology

**N/A.** No proxy/migration. Optional operator: force LLM fail (bad key / mock) → detail still shows structured fallback; list still shows takeaway/band.

---

## E2E verification (agent 4)

**Skip Agent 4** — no eligibility / ranking / Nest response shape change beyond display preference of existing fields.

If Agent 1 adds HTTP fail-path harness beyond unit specs → revisit (not planned).

---

## Tests / verification (plan for Agent 1–2)

- [ ] Empty chips → band list TLDR (existing + unknown-only)
- [ ] List TLDR never contains `Ambition alignment` / other chip keys
- [ ] Generator fluff / throw → fallback narrative without chip labels
- [ ] Phase 3: pack with about\* → fallback has no secret blob / excerpt dump
- [ ] `getById` fallback → `upsert` **not** called
- [ ] UI list: prefers takeaway; never shows reasonShort chip jargon; never dumps long narrative
- [ ] UI detail: prefers `matchNarrative`; short path = takeaway only (no reasonShort)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser smoke: deferred optional
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Stories 1–3 Done; this is the sprint closer for degrade paths.

---

## Next agent

```text
--agent 1 sprint 23 story 4
```

**Notes for next agent:**

- Prefer verify-first: most API paths already correct — **must** fix UI reasonShort fallbacks; fill any thin-path / test gaps.
- Do not bump to `v5`. Do not rewrite `buildReasonShort`.
- After CR → `--agent 3 sprint 23 story 4` (skip 4).
