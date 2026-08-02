# Story 37.2 — Edit Tab Guided Sections (LOCKED)

**Sprint:** 37 — Profile Polish  
**Story:** 2 — Redesign edit tab as 3 guided panes  
**Agent 0:** Architect  
**Date:** 2026-08-02  
**Status:** ACCEPT  
**Prerequisite:** Story **37.1** ACCEPT (done on `main`)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3`.  
**Repo:** `dating-ui` only  
**Needs mockup:** Design locked below  

**Context:** A prior 37.2 attempt (collapse accordion) existed only in the working tree, was never committed, and was wiped. **37.1** and **37.3** are on `main`. This lock **re-implements Edit** with the product-amended UX (panes, not collapse).

---

## Goal

Turn Edit tab from a long stacked form dump into **3 guided panes** (Basics → Photos → Story) with sticky section nav + progress dots, while **reusing** existing hub forms and **preserving** meter deep-link hashes (`#basic`, `#photos`, `#story`).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Edit today (on `main`) | `profile-edit-tab.tsx`: stacked `#basic` → `#story` → `#photos` — all H2s visible at once |
| Deep links | `lib/profile-completeness.ts` → `/profile?tab=edit#basic\|#photos\|#story` — **keep these ids** |
| Hub hash scroll | `profile-hub-client` scrolls to `document.getElementById(hash)` on mount/tab |
| Basics UI | `OnboardingBasicForm` `variant="profileHub"` — existing fields (birth date input, location texts, etc.) |
| Story UI | `OnboardingTextsForm` `variant="profileHub"` |
| Photos | `ProfilePhotoSection` — auto-save on upload |
| Completeness | `buildCompletenessFlags` / helpers in `profile-completeness.ts` |
| i18n | `hub.editSectionBasic` / `editSectionPhotos` / `editSectionStory` |
| Testid today | `profile-edit-tab` |
| page.spec | Mocks entire `ProfileEditTab` — prefer **new** `profile-edit-tab.spec.tsx` |

### Draft corrections (outdated — ignore)

- ❌ Accordion / auto-collapse completed sections — **REJECTED** after try (Photos/Story feel dead under Expand).  
- ❌ Rename anchors to `#basics` — breaks meter chips; keep **`#basic`**.  
- ❌ Invent birthdate month/day/year dropdowns or location picker modal — **reuse existing field UI**.  
- ❌ Strip location to one fake control — keep existing basics location block.  
- ❌ Rebuild forms / invent height-edu-smoking fields.  
- ❌ Require hub-tab dirty modal for ACCEPT.  
- ❌ “Done with photos” fake save — photos already persist on upload.  
- ❌ dating-api / Overview / Settings redesign (37.1 / 37.3 already shipped).  
- ❌ Unify onboarding routes in this story — out of scope (discuss later).

---

## Locked UX

### Section order

1. **Basics** — `id="basic"`  
2. **Photos** — `id="photos"`  
3. **Story** — `id="story"`  

(Was basic → story → photos on `main`; photos moves up in nav order.)

### Sticky section nav

```
[ Basics ] [ Photos ] [ Story ]
 ● ● ○     ← progress (complete / incomplete)
```

- Sticky near top of Edit panel.  
- Labels: reuse `hub.editSectionBasic` / `editSectionPhotos` / `editSectionStory`.  
- Click → **switch active pane** + `history.replaceState` hash `#basic` / `#photos` / `#story`.  
- Active: underline/bold (match existing zinc/blue tab language lightly).  
- Progress dots — complete when:

| Section | Complete when |
|---------|----------------|
| Basics | `basicsComplete(draft)` **and** `hasNickname` **and** `hasLocation` |
| Photos | ≥1 `APPROVED` photo |
| Story | `aboutMe.trim()` non-empty (nav progress only; do not change texts save API) |

Progress from profile + photo list on mount; refresh after save / photo mutate via `onProfileMutated`.

### One pane at a time (required)

```
┌─ sticky nav ─────────────────────────────┐
│ [ Basics ] [ Photos ] [ Story ]   ● ● ○  │
└──────────────────────────────────────────┘
┌─ active pane only ───────────────────────┐
│  H2 + existing form/component            │
└──────────────────────────────────────────┘
```

- **Only one section visible** at a time.  
- Inactive panes stay **mounted** with `hidden` / `aria-hidden` so form state is not lost when switching.  
- Hash / meter deep link **selects the pane** (`sectionFromHash` on mount + `hashchange`).  
- Hub `scrollIntoView` may still run; ensure the target pane is the active (visible) one when hash is present so scroll is not a no-op on `display:none`.  
- Optional ✓ on section title when complete — no Expand/Collapse controls.

### Forms (reuse)

| Section | Component |
|---------|-----------|
| Basics | `OnboardingBasicForm variant="profileHub"` |
| Photos | `ProfilePhotoSection` (+ `requiredForMatching` as today) |
| Story | `OnboardingTextsForm variant="profileHub"` |

Wire `onSaved` / `onMutated` → parent `onProfileMutated` + progress refresh.

### Dirty warning

Soft prefer only within Edit when switching panes with unsaved Story edits. **Not required for ACCEPT.**

---

## File plan

| Path | Action |
|------|--------|
| `components/profile/profile-edit-section-nav.tsx` | **new** sticky nav + progress dots |
| `components/profile/profile-edit-section-shell.tsx` | **new** pane chrome (`active` → show/hide; keep `id`) |
| `components/profile/profile-edit-tab.tsx` | Compose nav + 3 panes; hash sync; progress |
| `components/profile/profile-edit-tab.spec.tsx` | **new** — order, one visible, nav/hash, progress |
| Optional | tiny helpers for complete flags / hash parse |

Do **not** change Overview, Settings, dating-api, or onboarding routes.

Line budgets: soft ≤150 per new file; hard fail >200.

---

## Behavior freeze

- No dating-api.  
- Preserve `data-testid="profile-edit-tab"`.  
- Preserve hash ids `basic` / `photos` / `story`.  
- Meter chips continue to deep-link into the correct pane.  
- No accordion / Expand / Collapse.

---

## Tests / gates

1. Spec: nav order Basics → Photos → Story.  
2. Spec: only one pane visible by default; nav click shows target, hides others.  
3. Spec: `#photos` (or nav) sets photos pane active + hash.  
4. Spec: progress dots reflect mocked profile + approved photo.  
5. Hub `page.spec.tsx` still green.

---

## Acceptance criteria

- [x] Sticky nav with 3 sections + progress dots  
- [x] One pane visible at a time; others mounted but hidden  
- [x] Order Basics → Photos → Story  
- [x] Hashes `#basic` / `#photos` / `#story` select pane  
- [x] Existing forms reused (`profileHub` / `ProfilePhotoSection`)  
- [x] No collapse accordion  
- [x] Specs green; dating-ui only  

---

## Out of scope

| Item | Notes |
|------|--------|
| Onboarding route unification / photos-in-onboarding | Later product decision |
| Inline redesign of basics/story field widgets | Out |
| Overview / Settings | Already shipped 37.1 / 37.3 |
| Dirty modal across hub tabs | Optional |

---

## Agent 1 implementation order

1. Add `ProfileEditSectionNav` + `ProfileEditSectionShell` (pane, not collapse).  
2. Rewrite `ProfileEditTab`: active state, hash sync, progress refresh.  
3. Specs + handoff `agent-1-implement.md`.

---

## Done

Accepted 2026-08-02. See [agent-3-pm.md](./handoffs/STORY_02_edit_tab_sections/agent-3-pm.md).

**Sprint 37 (1–3) complete.** Optional later: `--agent 0` for onboarding photos align if product decides.
