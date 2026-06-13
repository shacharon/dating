# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_conversations_i18n.md](../../STORY_04_conversations_i18n.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 4 localizes **conversations UI** at `/dating/conversations`, `/dating/conversations/[id]`, and **`conversation-display.ts`** date/time formatters.
- Wire all user-facing **labels, empty states, composer, unmatch confirm, errors, and relative dates** via `useAppLocale()` → `copy.conversations.list`, `copy.conversations.detail`, `copy.conversations.format`, plus shared `copy.common` and `copy.reportUser.linkLabel` on detail footer.
- **`conversation-display.ts`** receives `format` copy + `locale` from callers — no hardcoded English date phrases in the display layer.
- **User message bodies** and **participant display meta** (`gender`, `29y` suffix) stay English meta v1 (same pattern as `match-display.ts`).
- Depends on Story 0 (`useAppLocale`, `conversations.*` schema). **Report dialog full copy** lives in shared `copy.reportUser` — verify `ReportUserDialog` only; do not re-scope match-detail wiring (Story 3).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/conversations/page.tsx` | updated — list chrome via `copy.conversations.list` + `formatMatchedAt` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — messaging chrome via `copy.conversations.detail` + format helpers |
| `dating-ui/src/app/dating/conversations/conversation-display.ts` | updated — locale + copy-driven date/time strings |
| `dating-ui/src/lib/i18n/types.ts` | verify — `conversations.format`, `list`, `detail` |
| `dating-ui/src/lib/i18n/en.ts` | canonical strings |
| `dating-ui/src/lib/i18n/es.ts` | full mirror |
| `dating-ui/src/lib/i18n/he.ts` | full mirror |
| `dating-ui/src/components/report-user-dialog.tsx` | verify — already uses `copy.reportUser` (shared) |
| `dating-ui/src/app/dating/conversations/page.spec.tsx` | updated by agent 2 — EN assertions remain green |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated by agent 2 — EN assertions remain green |

**No changes:** `dating-api/*`, messaging socket transport, `conversations-api.ts`

---

## Decisions (do not reverse without discussion)

### 1. Page scope — conversations list + detail + display helpers

| Surface | Story |
|---------|--------|
| `/dating/conversations` | **Story 4** |
| `/dating/conversations/[id]` | **Story 4** |
| `conversation-display.ts` | **Story 4** |
| `ReportUserDialog` body | **Verify only** — `copy.reportUser` (Sprint 9 / shared) |
| App shell nav unread | Story 5 |
| Message toast labels (`message-toast-labels.ts`) | Out of scope unless hardcoded EN found on these routes |

---

### 2. Integration pattern

**List page:**

```tsx
const { locale, copy } = useAppLocale();
const listCopy = copy.conversations.list;
const formatCopy = copy.conversations.format;

{listCopy.backToMatches} | {listCopy.title} | {listCopy.subtitle}
{copy.common.loading}
{listCopy.emptyTitle} | {listCopy.emptyBody} | {listCopy.browseMatches}
{listCopy.tryAgain} // error retry
{listCopy.unreadAria(count)} // badge aria
formatMatchedAt(item.matchedAt, formatCopy, locale)
```

**Detail page:**

```tsx
const detailCopy = copy.conversations.detail;
const formatCopy = copy.conversations.format;

{detailCopy.backToList}
{detailCopy.reconnecting} | {detailCopy.loadingMessages}
{detailCopy.loadEarlier} | {detailCopy.emptyMessages}
{detailCopy.messageLabel} | {detailCopy.messagePlaceholder}
{detailCopy.send} | {detailCopy.sending}
{detailCopy.unmatch} | {detailCopy.unmatchConfirm(otherName)}
{copy.common.cancel}
{copy.reportUser.linkLabel}
formatMatchedOnDate(data.matchedAt, formatCopy, locale)
formatMessageTime(msg.createdAt, formatCopy, locale)

// Errors — fallback to detailCopy.*Failed when Error.message absent
detailCopy.loadFailed | loadMessagesFailed | loadEarlierFailed | sendFailed | unmatchFailed
```

**Display helpers (`conversation-display.ts`):**

```tsx
export function formatMatchedAt(matchedAt, format, locale): string
export function formatMatchedOnDate(matchedAt, format, locale): string
export function formatMessageTime(createdAt, format, locale): string
// Uses format.* for relative phrases; Intl via toLocaleTimeString / toLocaleDateString(locale, …)
```

---

### 3. Copy keys (frozen for Story 4)

**`conversations.format`:**

| Key | Use |
|-----|-----|
| `matchedTodayAt(time)` | List + detail matched stamp (< 1 day) |
| `matchedYesterday` | 1 day ago |
| `matchedDaysAgo(days)` | 2–6 days |
| `matchedOn(date)` | ≥ 7 days or header date line |
| `justNow` | Message timestamp |
| `minutesAgo(n)` | Message timestamp |
| `yesterdayAt(time)` | Message timestamp |

**`conversations.list`:**

| Key | Use |
|-----|-----|
| `backToMatches`, `title`, `subtitle` | Nav + header |
| `tryAgain` | Error retry button |
| `emptyTitle`, `emptyBody`, `browseMatches` | Empty state |
| `unreadAria(count)` | Unread badge a11y |
| `loadFailed` | Fetch error fallback |

**`conversations.detail`:**

| Key | Use |
|-----|-----|
| `backToList`, `messagingAria` | Nav + region label |
| `reconnecting`, `loadingMessages` | Socket / load states |
| `loadEarlier`, `emptyMessages` | Pagination + empty thread |
| `messageLabel`, `messagePlaceholder`, `send`, `sending` | Composer |
| `unmatch`, `unmatchConfirm(name)` | Unmatch flow |
| `loadFailed`, `unmatchFailed`, `loadMessagesFailed`, `loadEarlierFailed`, `sendFailed` | Error fallbacks |

**Shared:**

| Key | Use |
|-----|-----|
| `common.loading`, `common.cancel` | Loading, unmatch cancel |
| `reportUser.linkLabel` | Report button on detail footer |

---

### 4. Explicitly English v1 (render unchanged)

| Content | Source |
|---------|--------|
| Message `text` bodies | User/API |
| `conversationPrimaryLabel` / `conversationSecondaryMeta` | `conversation-display.ts` — gender, `${ageYears}y`, location |
| Photo placeholder `?` | Visual fallback |

Section **labels** and **relative date phrases** are localized; **message content** and **participant meta strings** stay EN.

---

### 5. Realtime / polling (behavior unchanged)

| Mode | List page | Detail page |
|------|-----------|-------------|
| `ws` | `useMessagingSocket` for unread bump | `useMessagingSocket` + reconnect banner |
| `poll` | No socket | `POLL_INTERVAL_MS` poll unchanged |

i18n must not alter socket acquisition (`acquireMessagingSocket` singleton) or poll interval.

---

## Runtime topology (architect — realtime / proxy / cookies)

Story 4 is **UI copy only**; messaging transport is **unchanged** but pages participate in realtime — document for agent 1/2:

| Item | Value |
|------|--------|
| REST browser target | Same-origin `/api/v1/me/conversations*` via Next proxy (unchanged) |
| Socket browser target | Direct API origin when `NEXT_PUBLIC_REALTIME=ws` — singleton via `acquireMessagingSocket` (unchanged) |
| Cookie host rule | Session cookie on UI hostname; locale in `localStorage` only |
| Connection policy | Shared messaging socket — list + detail must not open duplicate connections |
| Expected Network tab | Same conversation/message requests; **no** new i18n endpoints; WS 101 unchanged when ws mode |
| `prisma migrate deploy` | **N/A** |

**Agent 1 browser smoke:** optional deferred — i18n does not change transport; existing conversation specs mock socket.

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test -- src/app/dating/conversations/page.spec.tsx`
- [ ] `cd dating-ui && npm test -- src/app/dating/conversations/\\[id\\]/page.spec.tsx`
- [ ] Existing EN tests: empty state, unmatch confirm, Send, reconnecting — must stay green
- [ ] Optional agent 2: Hebrew locale test for `listCopy.title` / `detailCopy.send` / localized `formatMatchedAt` phrase
- [ ] `prisma migrate deploy`: N/A

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Empty state, composer, unmatch confirm localized | `conversations.list` + `conversations.detail` |
| Relative dates locale-aware | `conversation-display.ts` + `conversations.format` + `Intl` |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 4
```

**Notes for next agent:**

1. Touch **conversations pages + `conversation-display.ts`** only for Story 4.
2. Verify `ReportUserDialog` already localized — do not duplicate keys.
3. Do not translate message bodies or `conversationPrimaryLabel` meta.
4. Pass `locale` + `formatCopy` into all `format*` helpers from pages.
5. Implementation likely **already on branch** — verify against this handoff; run both conversation spec files before agent 2.
