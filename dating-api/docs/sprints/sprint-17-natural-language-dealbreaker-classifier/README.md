# Sprint 17: Natural-language dealbreaker/requirement classifier

**Epic:** Let the engine read what a user already wrote — not a settings form — to decide whether a topic (smoking, kids, religion, pets, …) is a hard dealbreaker, a hard requirement, a soft preference, or nothing at all; use that to safely restore the compatibility coverage removed in Sprint 15, without ever asking the user to fill in a second, parallel form.
**Duration:** ~2–3 weeks (3 stories)
**Goal:** A closed, versioned taxonomy of topics gets a 4-way classification per profile (`HARD_EXCLUDE` / `HARD_REQUIRE` / `SOFT` / `NEUTRAL`), derived deterministically from free text at profile-analysis time. `HARD_EXCLUDE`/`HARD_REQUIRE` become real eligibility dimensions (reusing [Sprint 16](../sprint-16-matching-strictness-control/README.md)'s `UNKNOWN`/blocking-policy foundation); `SOFT`/`NEUTRAL` become ranking-only signal, same pattern as the existing personality/lifestyle/interest-tag overlays.
**Status:** **Done** — Stories 1–3 complete. Soft ranking remains deferred (Option **C** follow-up).
**Depends on:** [Sprint 16](../sprint-16-matching-strictness-control/README.md) (evaluator `UNKNOWN`/blocking-policy foundation)

---

## ⚠️ Soft ranking connection — **locked for Story 2: Option (C)**

Discovered while writing Sprint 16's Story 0 E2E baseline: `GET /api/v1/me/matches` orders by `matchScore` from V1 `compareWithStatus` — **not** `holy-grail-five-signal-ranking.ts`. Soft overlay on five-signal would be dead on the live path.

**Story 2 architect lock (2026-07-11):** **(C)** — ship `HARD_EXCLUDE`/`HARD_REQUIRE` eligibility only (`NEVER_BLOCKS` on silence). Defer soft ranking to a follow-up once ranking architecture is resolved.

Historical options (not chosen for Story 2):

- **(A)** Soft bonus into `compareWithStatus` (V1) — fastest live order impact; pollutes legacy engine.
- **(B)** Reconnect five-signal ranking to `/me/matches` first — separate epic.
- **(C)** Hard eligibility only this story — **chosen**.

Story 2 AC §C (ranking overlay) is **superseded** by this lock; see `handoffs/STORY_02_wire_into_holy_grail/agent-0-architect.md`.
---

## Why this sprint

Sprint 15 deleted education/smoking/alcohol/religion/wants-has-children as manual preferences because a missing self-fact hard-failed candidates, and no UI let users set those self-facts. The follow-up idea — a manual "Must match / Prefer / Don't care" toggle per dimension — was **rejected**: it just reintroduces a second settings form nobody asked for. The actual product insight: **users already say this in their own words.** "I don't want to date smokers" *is* a stated dealbreaker. "I smoke" is a neutral self-fact. "Only serious/marriage-minded people" is a stated requirement. The engine should read that, the same way it already reads a bio to infer personality/lifestyle/interest signals — it just doesn't have a *strength/polarity* dimension in its extraction yet.

**This already has a foundation in the codebase that was built once and then abandoned.** `dating-api/src/extraction/extracted-negatives.interface.ts` defines exactly this shape — closed tags across 4 categories, `strength: 'hard' | 'soft'`, an evidence quote, a confidence score — and it has **zero callers anywhere in `src/`**. It was part of the V2 extraction cluster frozen during legacy retirement (2026-04-06) and never reconnected to anything. This sprint revives and extends that design rather than inventing a new one.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Topic taxonomy | Revive `NEGATIVE_TAGS` from the dead `extracted-negatives.interface.ts` (behavioral: smoking/drugs/excessive_drinking/vaping; lifestyle: kids/pets/remote-work/locality; values: political/religious/moral incompatibility; social: jealousy/control/clingy/drama/emotional_unavailability/commitment_phobic) — closed and versioned, **not** open-ended free-topic detection |
| Requirement tags | Add a `HARD_REQUIRE`-capable counterpart tag only where it's semantically sensible (kids/pets/locality already have both directions, e.g. `no_kids` / `kids_required`; extend behavioral tags similarly, e.g. `only_non_smokers`). Values/social tags stay exclude-only — "only date jealous people" isn't a real product case |
| Per-tag classification | 4-way: `HARD_EXCLUDE` \| `HARD_REQUIRE` \| `SOFT` \| `NEUTRAL`, replacing the old binary `hard`/`soft` strength |
| Self vs. partner-preference | Unchanged existing domain split: a statement about the person's own trait ("I smoke") is a **self-fact**, never a preference by itself. Only statements about a desired/rejected *partner* trait feed this classifier |
| Detection approach | **Deterministic** regex + context-window + negation detection first (same discipline already proven by `personality-traits-text.extract.ts` / `lifestyle-signals-text.extract.ts` / `interest-tags-text.extract.ts` / `enrichment-v2.ts` — no LLM, no hallucination risk, fully testable). Revisit LLM-based extraction later only if recall proves insufficient — not a day-one requirement |
| Ambiguity default | Anything not an unambiguous, high-confidence match defaults to `SOFT`, never `HARD_EXCLUDE`/`HARD_REQUIRE`. Precision over recall for hard classifications |
| Architecture boundary | **Preserved, not broken.** The classifier runs once at profile-analysis time (Layer 1 territory) and writes a plain structured value (tag, classification, evidence, confidence) to DB. Holy Grail's mapper/evaluator still never reads raw text or calls an LLM at request time — same rule as today, just one more structured input feeding it |
| **Blocking policy on `UNKNOWN` for classifier-derived dimensions** | **`NEVER_BLOCKS`** — the deliberate asymmetry vs. `GENDER`/`AGE`. See callout below; this is the one decision that prevents this sprint from silently recreating the Sprint 15 bug |
| Auditability | Every `HARD_EXCLUDE`/`HARD_REQUIRE` classification carries its evidence quote + confidence into the audit/debug surface (`match-quality-audit.ts`) — never a black box |
| User visibility | User's own settings surface what got classified as a dealbreaker from their text (read-only this sprint; edit/override is a plausible future story, not required here) |

### Why classifier-derived dimensions can't reuse `GENDER`/`AGE`'s blocking policy

`GENDER` and `AGE` are structured onboarding fields with near-total fill rate — almost everyone has a gender and a date of birth on file, so blocking on `UNKNOWN` rarely fires and rarely matters. Free-text topic mentions are the opposite: **most profiles never mention smoking, religion, or kids at all.** If a searcher's stated dealbreaker ("no smokers") blocked every candidate whose profile is merely *silent* on smoking, it would exclude the overwhelming majority of candidates — the exact silent-zero-matches failure mode this whole effort exists to kill, just relocated from a settings checkbox into a classifier.

**So: a classifier-derived `HARD_EXCLUDE`/`HARD_REQUIRE` only blocks when the counterparty's own profile contains an explicit, classified, *conflicting* self-fact.** Silence blocks nothing. This is `NEVER_BLOCKS` on `UNKNOWN` even though the dimension itself is "hard" — a genuinely new combination Sprint 16's foundation must support (hard dimension, soft-on-unknown policy), distinct from `GENDER`/`AGE` (hard dimension, hard-on-unknown policy).

---

## Story checklist

| # | Story | Priority | Depends on | Status |
|---|--------|----------|------------|--------|
| 1 | [Revive + extend the topic taxonomy and deterministic classifier](./STORY_01_topic_taxonomy_and_classifier.md) | **P0** | — | **Done** |
| 2 | [Wire classifier output into Holy Grail eligibility + ranking](./STORY_02_wire_into_holy_grail.md) | **P0** | Story 1, Sprint 16 | **Done** (eligibility only; soft ranking deferred C) |
| 3 | [Auditability, safety guardrails, and user visibility](./STORY_03_auditability_and_guardrails.md) | **P0** | Story 2 | **Done** |

**Order:** 1 → 2 → 3. Nothing in this sprint reaches real users until Story 3's guardrails are in, even if Story 2 is functionally complete first — do not skip ahead.

---

## Sprint-level definition of done

- [x] Closed topic taxonomy revived + extended with `HARD_REQUIRE` counterparts where sensible; versioned like the existing personality/lifestyle/interest tag sets
- [x] Deterministic classifier (regex + negation + context-window) emits `HARD_EXCLUDE` / `HARD_REQUIRE` / `SOFT` / `NEUTRAL` per tag per profile, with evidence quote + confidence
- [x] `HARD_EXCLUDE`/`HARD_REQUIRE` become real evaluator dimensions with `NEVER_BLOCKS`-on-`UNKNOWN` policy (silence never excludes; only a stated conflicting fact does) — Story 2
- [ ] `SOFT`/`NEUTRAL` feed a bounded, capped ranking overlay — never touch eligibility (**deferred** — Story 2 Option C; follow-up once live ranking architecture is resolved)
- [x] Every hard classification is auditable (evidence + confidence visible in match-quality-audit.ts) — Story 3
- [x] Users can see (read-only) what the engine classified as a dealbreaker from their own text — Story 3
- [x] Full dating-api integration suite green (Story 3 close: integration.spec 300); UI i18n parity for Story 3 keys