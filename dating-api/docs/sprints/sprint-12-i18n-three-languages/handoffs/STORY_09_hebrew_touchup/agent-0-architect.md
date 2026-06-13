# Handoff: Agent 0 — Architect — Story 9

**Agent:** 0 architect  
**Story:** [STORY_09_hebrew_touchup.md](../../STORY_09_hebrew_touchup.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 9 wires **remaining high-traffic UI chrome** to `getCopy(locale)` so Hebrew/Spanish users see localized labels on surfaces that were still English hardcode.
- Four surfaces: **`/dating` hub**, **`/dating/analysis` page chrome**, **`NavAuth` unauthenticated strings**, **conversation message load errors**.
- New copy namespaces: **`datingHub`**, **`analysisPage`** (+ verify **`navAuth`**, **`conversations.detail.loadMessagesFailed`**).
- **Engine/API body text stays English v1** — analysis hero/insights from `evaluationJson`, message bodies, match explainability unchanged.
- Depends on Story 0 (`useAppLocale`, copy schema), Stories 2–5 (shell hook + prior route i18n).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/page.tsx` | updated — `useAppLocale()` → `copy.datingHub.*` |
| `dating-ui/src/app/dating/analysis/page.tsx` | updated — `copy.analysisPage.*` for chrome; `locale` for `toLocaleString` |
| `dating-ui/src/components/nav-auth.tsx` | verify — unauthenticated branch uses `copy.navAuth.*` (Story 1 keys) |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | verify — `detailCopy.loadMessagesFailed` fallback on fetch error |
| `dating-ui/src/lib/i18n/types.ts` | updated — `datingHub`, `analysisPage` schema |
| `dating-ui/src/lib/i18n/en.ts` | canonical strings |
| `dating-ui/src/lib/i18n/es.ts` | full mirror |
| `dating-ui/src/lib/i18n/he.ts` | full mirror |
| `dating-ui/src/app/dating/page.spec.tsx` | created by agent 2 — hub i18n tests |
| `dating-ui/src/app/dating/analysis/page.spec.tsx` | optional agent 2 — Hebrew chrome assertions |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | optional agent 2 — `loadMessagesFailed` on fetch error |

**Verify only (not Story 9 edits):**

| Path | Notes |
|------|--------|
| `dating-ui/src/components/analysis-progress-panel.tsx` | Uses `analysisProgress.*` (prior sprint); waiting-state panel on analysis route |
| `dating-ui/src/lib/analysis-presentation.ts` | Maps API JSON → view model (English body) |

**No changes:** `dating-api/*`, Privacy/Terms, onboarding form labels (deferred)

---

## Decisions (do not reverse without discussion)

### 1. Scope — page chrome only

| Surface | Story |
|---------|--------|
| `/dating` hub (`datingHub.*`) | **Story 9** |
| Analysis page chrome (`analysisPage.*`) | **Story 9** |
| NavAuth unauthenticated (`navAuth.*`) | **Story 9** (keys from Story 1) |
| Conversation messages load error | **Story 9** (`conversations.detail.loadMessagesFailed`) |
| Analysis **body** (hero, insight cards text) | **Out of scope** — API/LLM English v1 |
| User-written reference quotes (`aboutMe`, etc.) | User content — not translated |
| `AnalysisProgressPanel` waiting copy | Prior work — verify-only |
| NavAuth authenticated menu RTL | Story 8 |

---

### 2. Integration pattern

**Dating hub (`/dating/page.tsx`):**

```tsx
import { useAppLocale } from '@/lib/i18n';

const { copy } = useAppLocale();
const hub = copy.datingHub;

// hub.title, hub.subtitle, hub.getStarted, hub.viewMatches
```

**Analysis page (`/dating/analysis/page.tsx`):**

```tsx
const { locale, copy } = useAppLocale();
const pageCopy = copy.analysisPage;

// Loading / error chrome
{pageCopy.loading}
{pageCopy.loadFailed} {pageCopy.loadFailedHint}

// Results chrome (labels only — card text from vm.* stays EN)
{pageCopy.reRunAnalysis} | {pageCopy.analysisRunning}
{pageCopy.lastRunPrefix} + toLocaleString(locale, …)
{pageCopy.sectionHowWeRead}, sectionWhatYouWrote, insight* titles, reference* titles
ReferenceCard: pageCopy.referenceEmpty, showMore, showLess

// vm.heroTitle, vm.aboutMeInsight, etc. — DO NOT translate (API display JSON)
```

**NavAuth unauthenticated:**

```tsx
const copy = getCopy(locale);
// copy.navAuth.apiUnreachable | dismiss | signIn
// lastError from auth context: show localized apiUnreachable label, not raw message in span text
```

**Conversation detail message load error:**

```tsx
const detailCopy = copy.conversations.detail;
// catch: e instanceof Error ? e.message : detailCopy.loadMessagesFailed
```

---

### 3. Copy keys (frozen for Story 9)

**`datingHub`:**

| Key | Use |
|-----|-----|
| `title` | H1 |
| `subtitle` | Lead paragraph |
| `getStarted` | Primary CTA → `/onboarding` |
| `viewMatches` | Secondary link → `/dating/me-matches` |

**`analysisPage`:**

| Key | Use |
|-----|-----|
| `loading` | Initial fetch spinner text |
| `loadFailed`, `loadFailedHint` | Error alert |
| `reRunAnalysis`, `analysisRunning` | Re-run button labels |
| `lastRunPrefix` | Timestamp label prefix |
| `sectionHowWeRead`, `sectionWhatYouWrote` | Section headings |
| `insightAboutYou`, `insightHowYouRelate`, `insightWhoYouWant` | Insight card **titles** only |
| `referenceAboutMe`, `referenceRelationshipStyle`, `referencePartnerPreference` | Reference card titles |
| `referenceEmpty`, `showMore`, `showLess` | Reference card empty + expand |

**`navAuth` (verify — Story 1):**

| Key | Use |
|-----|-----|
| `apiUnreachable` | Error label when `lastError` set |
| `dismiss` | Clear error button |
| `signIn` | Sign-in link |

**`conversations.detail` (verify — Story 4 key, Story 9 wiring):**

| Key | Use |
|-----|-----|
| `loadMessagesFailed` | Fallback when `fetchConversationMessages` throws non-Error |

---

### 4. Out of scope (explicit v1 gaps)

| Content | Reason |
|---------|--------|
| `vm.heroTitle`, `vm.heroSubtitle`, insight card **body** | From `evaluationJson.display` — English engine output |
| `vm.note` | API flags narrative |
| Chat message `text` | User/API content |
| Privacy / Terms pages | Sprint decision — English v1 |
| Match explainability chips | API English v1 |

---

## Runtime topology (architect — auth / cookies)

| Item | Value |
|------|--------|
| REST | Unchanged — same profile/analysis/conversation endpoints |
| Locale | `useAppLocale()` / shell listener → `localStorage` `dating-ui.locale` |
| Analysis re-run | `POST /api/v1/me/profile/submit` — unchanged |
| Expected Network tab | No i18n API; localized labels client-side only |
| `prisma migrate deploy` | **N/A** |

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test -- src/app/dating/analysis/page.spec.tsx` — existing specs green
- [ ] `cd dating-ui && npm test -- src/app/dating/conversations/[id]/page.spec.tsx` — existing i18n specs green
- [ ] Agent 2: add `dating/page.spec.tsx` — Hebrew hub title + CTA labels from `heCopy.datingHub`
- [ ] Agent 2 optional: analysis page Hebrew section heading when `writeStoredLocale('he')`
- [ ] Agent 2 optional: conversation detail shows `loadMessagesFailed` when messages fetch rejects
- [ ] Agent 2 optional: `nav-auth.spec.tsx` — unauthenticated `signIn` label in Hebrew when `locale="he"`
- [ ] `prisma migrate deploy`: N/A

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Above surfaces use `getCopy(locale)` | Hub + analysis + navAuth + loadMessagesFailed |
| Hebrew copy file complete for new keys | `he.ts` mirrors `datingHub` + `analysisPage` |
| UI tests pass | Agent 2 full suite gate |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 9
```

**Notes for next agent:**

1. Touch **four surfaces** above; implementation likely **already on branch** — verify against this handoff.
2. Do **not** translate analysis hero/insight **body** text from API.
3. Do not refactor `AnalysisProgressPanel` unless a test gap requires it.
4. Hub route has **no spec file today** — agent 2 should add coverage.
