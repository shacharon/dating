# Sprint 18: Existing-match hard-block visibility

**Epic:** When a pair that was already on the user’s radar becomes hard-ineligible (dealbreaker / gender / age / …), don’t vanish them silently — keep the existing row visible but disabled, with clear reasons.
**Duration:** ~1 week (1–2 stories)
**Goal:** New candidates that fail hard eligibility still never appear. **Existing** relationships (Liked or ACTIVE mutual) that later become hard-FAIL are shown as disabled with one or more plain-language reasons (quotes where we have them).
**Status:** Done  
**Depends on:** [Sprint 17](../sprint-17-natural-language-dealbreaker-classifier/README.md) (classifier + NEVER_BLOCKS + inferred dealbreakers)

---

## Why this sprint

Sprint 17 correctly hides **new** hard conflicts (e.g. you don’t want smokers; they say “I smoke”). That is the right default for strangers who never showed up.

It is the **wrong** UX for someone you already saw or Liked: the card disappears (or stays with a stale score and no explanation), and “Refresh analysis” only talks about scores — not “this person no longer passes your dealbreakers.” Users then think the product is broken.

---

## Decisions (locked)

| Decision | Locked |
|----------|--------|
| Who is affected | **Viewer only** — do not globally disable the other user’s profile |
| New candidates | Unchanged — hard FAIL → omit from list (no warning card) |
| Existing candidates | Stay visible, **disabled**, with reasons |
| What counts as “existing” | **`MatchAction.LIKE` or ACTIVE `MutualMatch`** (not PASS-only; no list-impression table) |
| Disabled sort | Bottom of the same `matches` array |
| Liked UI | Keep Liked chip + disabled banner |
| Reasons copy | API EN `message` + `code`/`evidence`; UI i18n from code+quotes |
| Auto-unmatch / auto-PASS | **No** this sprint — user decides what to do with the disabled card |
| Notify the other person | **No** |

---

## Story checklist

| # | Story | Priority | Depends on | Status |
|---|--------|----------|------------|--------|
| 1 | [Disable existing matches that became hard-ineligible, with reasons](./STORY_01_existing_match_hard_block_reasons.md) | **P0** | Sprint 17 | Done |

---

## Sprint-level definition of done

- [x] New hard conflicts still never appear as fresh matches
- [x] Existing hard conflicts appear disabled with ≥1 reason (multi-reason supported)
- [x] Copy is viewer-facing and i18n’d (`en` / `es` / `he`)
- [x] E2E: new conflict omitted; existing Liked conflict visible + disabled + reason
- [x] Soft ranking still deferred (Sprint 17 Option C) — out of scope here
