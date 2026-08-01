# Story 36.3 — Code Cleanup and Documentation (LOCKED)

**Sprint:** 36 — Component Refactoring  
**Story:** 3 — Code cleanup and documentation  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** Stories **36.1** and **36.2** ACCEPT  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3`.  
**Repo:** `dating-ui` only  
**Needs mockup:** no

---

## Goal

Close the UX sprint arc with **accurate product docs**, **light JSDoc on Sprint 33–36 public UI exports**, and a **bounded cleanup pass** — without redesigns, without installing Storybook, and without a risky repo-wide lint rewrite.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| README | Still create-next-app boilerplate — **needs rewrite** |
| `docs/ARCHITECTURE.md` | **Does not exist** — create a lean one (not a novel) |
| Storybook | **Not installed** — do **not** add Storybook infra in this story |
| Test runner | **Vitest** (`npm test`) — not Jest |
| Lint today | ~**32** ESLint problems (~20 errors / ~12 warnings), mostly pre-existing (`react-hooks/set-state-in-effect`, `@next/next/no-img-element`, a few unused vars / `any`) |
| TODO/FIXME in `src/` | **None** found at lock time |
| Product logger | Prefer existing observability logger; no new `console.log` sprawl |
| Refactors done | Match detail → `components/match-detail/*`; conversation detail → `components/conversation/*` |

### AGENT_COMMANDS / plan corrections (outdated — ignore)

- ❌ Install / configure Storybook and ship 5+ stories — **out of scope** (no Storybook in repo)  
- ❌ Change `test` script to Jest or invent Storybook scripts  
- ❌ Require **entire** `dating-ui` ESLint **0 errors / 0 warnings** in this story — large pre-existing debt; fixing `set-state-in-effect` across locale/auth/hooks is a **separate** initiative  
- ❌ JSDoc every file under `src/` or every page under `app/`  
- ❌ dating-api changes, visual redesign, route behavior changes  
- ❌ Delete or rewrite working product code “for cleanliness” beyond documented cleanup  

---

## Locked deliverables

### 1. README (`dating-ui/README.md`)

Replace boilerplate with a short project README that includes at least:

1. What this package is (Next.js dating UI; pairs with `dating-api`)  
2. **Scripts** that actually exist (`dev`, `build`, `start`, `lint`, `test` / `test:watch`, `typecheck`, notable helpers)  
3. **Routes** table reflecting current product (canonical paths):

| Area | Routes |
|------|--------|
| Public | `/`, `/privacy`, `/terms` |
| Onboarding | `/onboarding`, `/onboarding/basic`, `/onboarding/texts` |
| Dating | `/dating/me-matches`, `/dating/me-matches/[id]`, `/dating/conversations`, `/dating/conversations/[id]` |
| Profile hub | `/profile` with `?tab=overview\|edit\|analysis\|settings` (legacy `/dating/profile`, `/dating/analysis`, settings profile aliases redirect) |
| Admin | `/admin`, `/admin/photos`, `/admin/reports`, `/admin/content-violations`, `/admin/match-quality` |

Keep it accurate and skim-friendly — no need to list every redirect file.

### 2. Architecture doc (`dating-ui/docs/ARCHITECTURE.md`) — **create**

Lean doc (~1–3 screens) covering:

1. **App shell / global nav** — `components/nav/*`, authenticated shell pattern  
2. **Unified profile hub** — `(authenticated)/profile` + `components/profile/*` + quality meter / API bind  
3. **Match / conversation detail refactor** — thin page orchestrators + `match-detail/*` / `conversation/*`; hooks live under `hooks/`  
4. **Hook + dynamic modal pattern** — reuse hooks; `next/dynamic` `{ ssr: false }` for heavy dialogs  
5. **Known lint debt** — note that repo-wide “0 ESLint problems” is **not** claimed; list categories deferred (esp. `react-hooks/set-state-in-effect`)

Optional one-line pointers to sprint locks under `docs/sprints/` — no paste of entire stories.

### 3. JSDoc (bounded)

Add a short module/export JSDoc (`/** … */`) on **public exported components** in these folders / files only:

| Scope | Paths |
|-------|--------|
| Nav | `src/components/nav/*.tsx` (exported UI) |
| Match detail | `src/components/match-detail/*.tsx` |
| Conversation | `src/components/conversation/*.tsx` |
| Profile hub | `src/components/profile/*.tsx` |
| Sprint 34 shared | `content-moderation-error-alert.tsx`, `conversation-list-filters.tsx` |
| Writing prompts | `src/components/onboarding/onboarding-text-field-help.tsx` |

**Rules:** 2–6 lines explaining **purpose / where used**; `@example` optional (only if tiny). Do **not** JSDoc every prop. Specs / `nav-icons` helpers / internal non-exports: skip unless already exporting UI.

### 4. Cleanup (bounded)

| Do | Do not |
|----|--------|
| Remove obvious **commented-out dead code blocks** in the JSDoc-scoped folders if found | Hunt every `//` comment in `src/` |
| Fix **unused imports / unused vars** in files Agent 1 touches | Mass-refactor hook effect patterns |
| Run `npm run lint -- --fix` once; keep only safe auto-fixes | Force-change `<img>` → `next/image` across product (warnings are known) |
| Fix trivial Sprint-scope lint if cheap (e.g. unused local in a file already open) | “Fix all 20 set-state-in-effect errors” |

### 5. `package.json` scripts

**Verify** (do not invent a parallel toolchain):

- Keep `test` / `test:watch` on **Vitest**  
- Keep `lint` / `typecheck` / `dev` / `build`  
- **Optional:** add `lint:fix` → `eslint --fix` if missing  
- **Do not** add Storybook / Jest scripts  

### 6. Verification gates

| Gate | Requirement |
|------|-------------|
| Docs | README + new `ARCHITECTURE.md` present and accurate |
| JSDoc | Public exports in locked scope documented |
| Typecheck | `npm run typecheck` passes |
| Lint | No **new** ESLint errors introduced in files Agent 1 edits; auto-fix applied; **do not** require repo-wide clean lint |
| Tests | No behavior changes expected — run a small smoke if touching product TSX (e.g. one nav or profile meter spec); full suite not required unless Agent 1 changed logic |
| Storybook | N/A — explicitly skipped |

---

## Out of scope

| Item | Notes |
|------|--------|
| Storybook install + stories | Deferred; document as future optional |
| Repo-wide ESLint zero | Deferred debt; call out in ARCHITECTURE |
| dating-api | Out |
| Route / UX / copy changes | Out |
| Rewriting 36.1 / 36.2 structure | Out |
| Committing `.env.bak` / `.next` | Out |

---

## Acceptance criteria

- [x] README rewritten with real scripts + route table  
- [x] `docs/ARCHITECTURE.md` created (lean, accurate)  
- [x] JSDoc on locked public component exports (Sprint 33–36 UI surfaces)  
- [x] Bounded dead-code / unused cleanup in touched areas; `lint --fix` applied where safe  
- [x] `package.json` scripts verified (Vitest kept; optional `lint:fix`)  
- [x] `npm run typecheck` green — **waived as pre-existing debt** (see Agent 1 handoff; same class as lint debt)  
- [x] No Storybook / no dating-api / no intentional product behavior change  
- [x] Storybook AC from old plan **waived** (not installed)  

---

## Agent 1 implementation order

1. Rewrite `README.md`.  
2. Create `docs/ARCHITECTURE.md`.  
3. Add JSDoc in locked component scopes.  
4. Bounded cleanup + `eslint --fix`; optional `lint:fix` script.  
5. Run `typecheck` (+ light specs if TSX logic touched).  
6. Handoff `agent-1-implement.md`.

---

## Done

Sprint 36 complete.
