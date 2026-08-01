# Story 36.2 — Refactor Conversation Detail Page (LOCKED)

**Sprint:** 36 — Component Refactoring  
**Story:** 2 — Refactor conversation detail page  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** none (parallel with 36.1 OK; sequential preferred)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3`.  
**Repo:** `dating-ui` only  
**Needs mockup:** no

---

## Goal

Split `conversations/[id]/page.tsx` (~490 lines) into a thin orchestrator + presentational pieces under `components/conversation/`, **without** changing product behavior, copy, testids, realtime mode, or visuals. Message/action hooks already exist — **reuse them**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Page | `src/app/dating/conversations/[id]/page.tsx` — client, ~490 lines |
| Specs | Large `[id]/page.spec.tsx` (~980 lines) — **must stay green**; keep `data-testid`s |
| Hooks (already used) | `hooks/use-conversation-messages.ts`, `hooks/use-conversation-actions.ts` (+ specs) |
| Composer | Draft / char limit / Enter-to-send live **inline** on the page today — **not** a separate hook |
| Report | `ReportUserDialog` already `dynamic(..., { ssr: false })` |
| Helpers | `conversation-display.ts`, `conversation-message-limits`, `conversation-focus`, `getRealtimeMode` |
| Scroll | Local `scrollListToBottom` / `isNearBottom` + two `useEffect`s on the page |

### AGENT_COMMANDS corrections (outdated — ignore)

- ❌ “Create” `useConversationMessages` / `useConversationActions` — they **already exist**  
- ❌ Require `useMessageComposer` as a new hook — **optional**; prefer draft state inside `ConversationMessageComposer`  
- ❌ Change WebSocket / poll realtime behavior or socket ownership  
- ❌ Visual redesign (including blue bubble colors — keep as shipped)  
- ❌ Rewrite `page.spec.tsx` wholesale  
- ❌ dating-api changes  

---

## Locked target structure

```
app/dating/conversations/[id]/page.tsx     ← orchestrator
components/conversation/
  conversation-header.tsx                  ← back link + match card
  conversation-message-list.tsx            ← reconnect banner, list, load earlier, bubbles, empty/error/loading
  conversation-message-composer.tsx        ← moderation alert, textarea, char count, send
  conversation-actions.tsx                ← report ⋯ menu + unmatch confirm
  conversation-modals.tsx                  ← ReportUserDialog dynamic import (optional colocate)
```

Optional (if list file > 150): extract `conversation-message-bubble.tsx` — **behavior unchanged**.

Keep `../conversation-display.ts` where it is.

### Orchestrator responsibilities

1. `useParams` / `useAuth` / `useAppLocale` / `useConversationUnread`  
2. `setActiveConversationId` focus effect  
3. Load conversation meta: `fetchMyConversationById`  
4. Wire `useConversationMessages` / `useConversationActions`  
5. Loading / error chrome for **meta** load  
6. Compose extracted components  
7. Own `reportOpen` (and pass into actions/modals) — unmatch confirm may live in actions  
8. Scroll helpers + auto-scroll effects: **prefer move into `ConversationMessageList`** (keeps page thin); if awkward, keep on page  

**Target size:** page ideally **≤ ~150 lines**; hard fail if still a monolith (**> 300**).

### Component responsibilities

| Component | Must preserve |
|-----------|----------------|
| Header | `conversation-back-link`; `conversation-match-card`; `conversation-matched-date`; photo / `?` placeholder; primary/secondary labels |
| Message list | `conversation-messaging`; `conversation-reconnecting` (ws only); `conversation-message-list`; loading / error / empty / `conversation-load-earlier`; bubbles `conversation-message-bubble` + `data-sender`; `conversation-message-time` |
| Composer | `conversation-message-input` id; `conversation-char-count`; `conversation-send-button`; `conversation-send-error`; `ContentModerationErrorAlert` for send moderation |
| Actions | `conversation-report-menu` / `conversation-report-open`; `conversation-unmatch-confirm`; unmatch copy with other name |
| Modals | `contextType="CONVERSATION"`; same `contextId` / `subjectLabel` |

### Line budgets (soft, CR judgment)

| Unit | Prefer | Hard fail |
|------|--------|-----------|
| Each new component | ≤ 150 | > 200 |
| Orchestrator page | ≤ 150 | > 300 |

If message list exceeds 150, extract bubble component.

### Hooks / composer

- **Reuse** `useConversationMessages` + `useConversationActions` — do not fork under `components/conversation/`.  
- **Do not** invent a parallel messaging socket layer.  
- Composer: local draft state + call `sendMessage(draft)` from the messages hook (clear draft on success; scroll to bottom) — same as today.  
- `useMessageComposer` hook: **not required** for ACCEPT.

### Modals

- Move `dynamic(ReportUserDialog)` into `conversation-modals.tsx` (or actions file) so the page stays thin.  
- Keep `{ ssr: false }`.

---

## Behavior freeze (regression)

Covered primarily by existing `[id]/page.spec.tsx`:

- Meta load success / error / loading  
- Message load, empty, earlier pagination  
- Send (incl. Enter without Shift), char limit, moderation + send error  
- Socket reconnecting banner when `realtimeMode === 'ws'`  
- Unmatch confirm flow  
- Report dialog open  
- Focus: `setActiveConversationId` on mount/unmount  

No API / i18n key / route changes.

---

## Tests

1. Existing `[id]/page.spec.tsx` **green** (primary gate).  
2. Existing `use-conversation-messages` / `use-conversation-actions` specs green.  
3. Optional presentational unit smokes — **not required**.

---

## Out of scope

| Item | Where |
|------|--------|
| Match detail refactor | **36.1** (done) |
| Broader cleanup / docs | **36.3** |
| Conversations **list** page split | Later |
| Changing bubble colors / realtime mode | Out |
| dating-api | Out |

---

## Acceptance criteria

- [x] UI split into `components/conversation/*` per locked tree  
- [x] Orchestrator no longer holds the big messaging JSX inline  
- [x] Hooks reused (not reimplemented)  
- [x] Dynamic report dialog preserved  
- [x] All existing `data-testid`s and behavior preserved  
- [x] `[id]/page.spec.tsx` + conversation hook specs green  
- [x] No dating-api / no intentional visual redesign  

---

## Agent 1 implementation order

1. Extract Header (nav + match card).  
2. Extract MessageList (+ bubble if needed); move scroll helpers/effects with the list if practical.  
3. Extract MessageComposer (owns draft).  
4. Extract Actions + Modals.  
5. Slim page orchestrator.  
6. Run `[id]/page.spec.tsx` + hook specs; handoff `agent-1-implement.md`.

---

## Done

```
--agent 0 sprint 36 story 3
```
