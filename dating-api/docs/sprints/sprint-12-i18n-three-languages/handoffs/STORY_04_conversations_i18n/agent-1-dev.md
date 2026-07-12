# Handoff: Agent 1 — Senior dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_conversations_i18n.md](../../STORY_04_conversations_i18n.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Verified **conversations i18n** against `agent-0-architect.md` — all artifacts present on branch; no new code required for Story 4 DoD.
- **`/dating/conversations/page.tsx`** uses `useAppLocale()` → `copy.conversations.list` + `formatMatchedAt(..., formatCopy, locale)`.
- **`/dating/conversations/[id]/page.tsx`** uses `copy.conversations.detail` + `formatMatchedOnDate` / `formatMessageTime`; shared `common` and `reportUser.linkLabel`.
- **`conversation-display.ts`** — all relative date/time strings driven by format copy + `Intl` with passed `locale`.
- **`ReportUserDialog`** — verified uses `copy.reportUser` via locale listener (shared component).
- **Message bodies** and **`conversationPrimaryLabel` meta** (`gender`, `29y`) remain English v1 (intentional).
- **No backend / Prisma changes.** Socket/poll transport unchanged.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/conversations/page.tsx` | verified — full list chrome via i18n |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | verified — messaging chrome via i18n |
| `dating-ui/src/app/dating/conversations/conversation-display.ts` | verified — locale + copy formatters |
| `dating-ui/src/lib/i18n/types.ts` | verified — `conversations.format`, `list`, `detail` |
| `dating-ui/src/lib/i18n/en.ts` | verified — canonical strings |
| `dating-ui/src/lib/i18n/es.ts` | verified — mirror |
| `dating-ui/src/lib/i18n/he.ts` | verified — mirror |
| `dating-ui/src/components/report-user-dialog.tsx` | verified — `copy.reportUser` |
| `dating-ui/src/app/dating/conversations/page.spec.tsx` | existing — 13 EN tests green |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | existing — 38 EN tests green |

**No changes:** `dating-api/*`, `conversations-api.ts`, messaging socket layer

---

## Decisions (do not reverse without discussion)

- Relative date phrases from `conversations.format`; calendar portions via `toLocaleDateString` / `toLocaleTimeString(locale, …)`.
- Error fallback uses `listCopy.loadFailed` / `detailCopy.*Failed` when `Error.message` absent.
- Participant display meta stays English v1 per architect.

---

## Runtime topology

| Item | Value |
|------|--------|
| REST | `GET /api/v1/me/conversations*` unchanged |
| Socket | Singleton `acquireMessagingSocket` when ws mode — unchanged |
| Locale | localStorage + `useAppLocale()` |
| Browser smoke | **Deferred** — i18n-only; operator / Story 6 |

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/app/dating/conversations/page.spec.tsx` → **13/13 pass**
- [x] `cd dating-ui && npm test -- src/app/dating/conversations/[id]/page.spec.tsx` → **38/38 pass**
- [ ] Full `npm test` — agent 2 gate
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: deferred

### How to manual smoke

1. `/dating/conversations` → English title “Conversations”, empty state copy.
2. Open a thread → composer placeholder, Send, Unmatch confirm in English.
3. Settings → Hebrew → list title `שיחות`, detail Send `שליחה`, matched date in Hebrew format.
4. Confirm message text and `FEMALE · 29y` meta still English (expected v1).

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 12 story 4
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — conversations list + detail + display helpers only.
- Optional: Hebrew locale tests for list H1, detail composer, localized `formatMatchedAt`.
- Do not fail CR for English message bodies or participant meta strings.
