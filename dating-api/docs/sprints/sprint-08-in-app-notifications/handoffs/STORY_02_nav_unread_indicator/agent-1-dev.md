# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_nav_unread_indicator.md](../../STORY_02_nav_unread_indicator.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Shipped **nav unread indicator** — emerald numeric pill on “Conversations” link; cap **99+**; `aria-label` via i18n.
- **Consolidated shell realtime** — `MessageToastProvider` → `MessagingShellProvider` (single `useMessagingSocket` for toast + nav bump).
- **Unread total** derived client-side from `GET /api/v1/me/conversations` (`sum(unreadCount)`); optimistic `+1` on peer `message.new`; reconcile on list load, visibility, mark-read.
- Story 1 toast behavior preserved (skip rules, 5s dismiss, click navigate, Someone fallback).
- **29 unit tests** pass on story scope (see below).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/conversation-unread-total.ts` | created |
| `dating-ui/src/lib/message-in-app-notify.ts` | add `shouldBumpUnreadForMessage` |
| `dating-ui/src/contexts/conversation-unread-context.tsx` | created |
| `dating-ui/src/components/messaging-shell-provider.tsx` | created — replaces toast-only provider |
| `dating-ui/src/components/message-toast-provider.tsx` | **deleted** |
| `dating-ui/src/components/authenticated-app-shell.tsx` | `MessagingShellProvider` wraps nav + children; nav badge |
| `dating-ui/src/app/dating/conversations/page.tsx` | `reconcileFromList` via shared `load()` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | `refreshNavUnread()` after mark-read |
| `dating-ui/src/lib/i18n/types.ts` | `nav.conversationsUnreadLabel` |
| `dating-ui/src/lib/i18n/en.ts` / `es.ts` | nav badge aria copy |
| `dating-ui/src/lib/conversation-unread-total.spec.ts` | created — 2 tests |
| `dating-ui/src/contexts/conversation-unread-context.spec.tsx` | created — 3 tests |
| `dating-ui/src/components/messaging-shell-provider.spec.tsx` | created — 9 tests (migrated Story 1 + nav bump) |
| `dating-ui/src/components/authenticated-app-shell.spec.tsx` | created — 2 tests |
| `dating-ui/src/components/message-toast-provider.spec.tsx` | **deleted** (migrated) |
| `dating-ui/src/app/dating/conversations/page.spec.tsx` | mock `useConversationUnread` |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | mock `useConversationUnread` |

**No changes:** `dating-api/*`

---

## Decisions (do not reverse without discussion)

- Followed architect: single shell socket; nav inside provider; no fourth `useMessagingSocket`.
- `shouldBumpUnreadForMessage` aliases toast skip rules (`shouldShowMessageToast`).
- List page initial fetch uses shared `load()` so `reconcileFromList` runs on mount and visibility refetch.
- `peerLabelsRef` warmed via `onConversationsFetched` callback on unread provider `refresh()`.

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/lib/conversation-unread-total.spec.ts src/contexts/conversation-unread-context.spec.tsx src/components/messaging-shell-provider.spec.tsx src/components/authenticated-app-shell.spec.tsx src/app/dating/conversations/page.spec.tsx` → **29/29 pass**
- [ ] Manual smoke (operator) — **pending user**

### How to manual smoke

1. Ensure `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local`.
2. Start API + UI; log in as B with 2+ unread conversations.
3. B on `/dating/profile` (or any non-conversations page) → nav “Conversations” shows pill with total.
4. B opens a thread → mark-read runs → pill clears or updates.
5. A sends while B on `/dating/me-matches` → pill increments without refresh.
6. Pill hidden when total is 0.

---

## Open questions / blockers

- `conversations/[id]/page.spec.tsx` has **10 pre-existing failures** (missing `MESSAGING_EVENT_CONVERSATION_*` mock exports, duplicate testid under StrictMode) — unrelated to Story 2; agent 2 may fix if touching that file.

---

## Next agent

```text
--agent 2 sprint 8 story 2
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — confirm single socket, reconcile wiring, no API drift.
- Run story test targets above; consider fixing `[id]/page.spec.tsx` socket mock if doing full-suite gate.
- Story 1 regression: dismiss + Someone tests live in `messaging-shell-provider.spec.tsx`.
