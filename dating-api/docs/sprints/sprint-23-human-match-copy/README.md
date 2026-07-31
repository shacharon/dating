# Sprint 23: Human match copy — list TLDR + profile why

**Epic:** Sprint 22 made match **detail** return a long LLM narrative from structured facts. The **list** still shows chip jargon (`You share real overlap on Ambition alignment…`). Detail prose is better but still soft brochure — and it cannot use real profile words, so it lacks “music.” This sprint splits the jobs clearly: **list = one plain line**, **profile = full why** (voice first, then controlled free-text).
**Duration:** ~1–1.5 weeks (4 stories)
**Goal:** Opening “Your matches” never shows chip names. Opening a match shows a grounded, human why (points + feel). LLM failure never leaves blank or chip soup. Scoring untouched.
**Status:** Done
**Depends on:** Sprint 22 Stories 1–4 Done (`matchNarrative`, cache, UI, voice v2)

---

## Why this sprint

| Surface | Job | Today | Target |
|---------|-----|-------|--------|
| **List** | Should I open? | Chip jargon in `reasonShort` | One plain English line |
| **Profile** | Why this person? | Long Phase 2 paraphrase (still fluffy) | Full why: clear points + feel; later real profile words |

Same three facts in both places today — different costume. Users feel that. Fix the split.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| List copy | **Deterministic plain TLDR** from trait evidence / human chip map — **no LLM on list** (cheap, fast, no cache drama). |
| List field | Prefer a dedicated short field or rewrite `reasonShort` / list display so UI never shows chip labels. Architect picks in Story 1. |
| Profile | Keep lazy `matchNarrative` + evaluation-keyed cache. Bump `promptVersion` when voice or Phase 3 contract changes. |
| Profile Story 2 | Voice harden **without** raw `about*` (bans, closers, optional evidence polish). |
| Profile Story 3 | Controlled free-text subset (Phase 3) for “music” — redaction required; no inventing biography. |
| Fallback | Story 4: list + detail always human on LLM/template fail — never blank, never “Ambition alignment” lists. |
| Scoring / HG / ranking | **Untouched.** |
| List stays short | Never put full narrative on list cards. |
| Agent 4 | Only if a story touches eligibility / ranking / matches HTTP contract in a way that needs harness — Story 1 may need list DTO check; Stories 2–3 skip if Nest shape unchanged. |

---

## Story checklist

| # | Story | Priority | Depends on | Status |
|---|-------|----------|------------|--------|
| 1 | [List: plain one-line TLDR (no chip names)](./STORY_01_list_plain_tldr.md) | **P0** | — | Done |
| 2 | [Profile: kill leftover fluff (voice v3)](./STORY_02_profile_voice_v3.md) | **P0** | — | Done |
| 3 | [Profile: full why with controlled free-text (Phase 3)](./STORY_03_profile_full_why_phase3.md) | **P0** | Story 2 | Done |
| 4 | [Fallback: never blank, never chip soup](./STORY_04_fallback_human.md) | **P0** | Stories 1–3 Done | Done |

**Execution order (locked):**

1. Story 1 — list TLDR (ships visible win immediately).
2. Story 2 — profile voice v3 (can parallel Story 1).
3. Story 3 — Phase 3 free-text after Story 2 voice rules are stable.
4. Story 4 — harden fallbacks across list + detail (finish after 1–2; extend if Story 3 landed).
5. You eyeball: list card + detail for same match; force LLM fail once.

---

## Sprint-level definition of done

- [x] Match **list** line is plain English; no chip labels (`Ambition alignment`, etc.). *(Story 1)*
- [x] Match **detail** narrative has no brochure filler CTAs / banned fluff (v3+). *(Story 2)*
- [x] Phase 3: detail may use **redacted** free-text excerpts; still no invented facts; cache version bumped. *(Story 3 — `v4`)*
- [x] LLM / validation fail → human fallback on list and detail; never blank; never chip-name lists. *(Story 4)*
- [x] List never renders full `matchNarrative`. *(Story 1 / Sprint 22.3 — reconfirmed)*
- [x] Scores / HG eligibility / blend weights unchanged. *(Stories 1–4)*
- [x] Unit (+ UI) coverage for list TLDR, voice bans, Phase 3 guardrails, fallbacks. *(Stories 1–4)*
- [x] Phase 3 legal/product note acknowledged in Story 3 handoff. *(Agent 3)*

**Sprint status:** **Done** — Stories 1–4 complete. Optional operator eyeball: list + detail same match; force LLM fail once.

**Follow-up:** [Sprint 24 — denser match detail narrative](../sprint-24-denser-match-narrative/README.md) — **reverted** (kept `v4`).

