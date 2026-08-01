# Story 34.3 — Message Timestamps in Conversation Thread (LOCKED)

**Sprint:** 34 — Messaging & Content  
**Story:** 3 — Timestamps on conversation messages  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** **ACCEPT** (Story 34.3 complete)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` (frontend only — no backend phase).  
**Needs mockup:** no  

---

## Goal

Keep **always-visible** timestamps under each thread bubble (sent + received), and finish age-based formatting so older-than-yesterday messages in the last week show weekday + time.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Thread page | `dating-ui/src/app/dating/conversations/[id]/page.tsx` |
| Helper | `formatMessageTime` in `conversation-display.ts` (+ shared by inbox list) |
| Visibility today | Timestamp is **already always visible** below each bubble (`data-testid="conversation-message-time"`), aligned with bubble (`items-end` / `items-start`), subtle `text-xs text-zinc-400 dark:text-zinc-500` |
| Not hover-only | No `group-hover` / opacity hide — UX review / AGENT_COMMANDS “hover only” is **outdated** |
| Spec today | Page asserts time node + “Just now” for recent send |
| Data | `MessageDto.createdAt` ISO-8601 (already on API) |

### AGENT_COMMANDS / plan corrections (outdated — ignore)

- ❌ “Timestamps only on hover” — already always visible  
- ❌ “timestamp in data-testid only” as if not rendered — text is rendered  
- ❌ New `lib/time-format.ts` — keep logic in `conversation-display.ts`  
- ❌ Day separators / sticky date headers — **out of scope**  
- ❌ Changing inbox list timestamp rules beyond shared helper side effects  

---

## Locked UX (thread)

```
┌─────────────────────────────┐
│ Hey, how are you doing?     │  ← bubble
└─────────────────────────────┘
  2:45 PM                       ← always visible, subtle
```

| Rule | Lock |
|------|------|
| Placement | Directly under bubble text, same column alignment as bubble (mine end / peer start) |
| Color | Keep subtle zinc tokens (do not use primary / high-contrast body color) |
| Sent + received | Same formatter + layout pattern |
| Mobile | No truncation tricks required; wrapping OK; keep `max-w-[85%]` on bubble only |
| Dark mode | Keep existing dark zinc tokens |

**Do not** hide timestamps behind hover/press.

---

## Locked format (`formatMessageTime`)

Shared helper (thread + list). Preserve existing early buckets; **add** this-week weekday.

| Age | Output | Notes |
|-----|--------|-------|
| < 1 minute | `format.justNow` | Keep |
| < 60 minutes | `format.minutesAgo(n)` | Keep (better than clock for very recent) |
| Today, ≥ 1h | Locale clock via existing `formatTimeOfDay` | e.g. `2:45 PM` |
| Yesterday | `format.yesterdayAt(time)` | Keep existing i18n (EN: `Yesterday 2:45 PM`) |
| **This week** (calendar day diff **2…6** from today) | `{weekdayShort}, {time}` | **New** — weekday via `toLocaleDateString(locale, { weekday: 'short' })` + existing clock; e.g. `Mon, 2:45 PM` |
| Older (diff ≥ 7 days) | `{mediumDate} {time}` | Keep current `dateStyle: 'medium'` + clock |

### Explicit non-goals for format

- Do **not** remove `justNow` / `minutesAgo` to force clock-only “today” (AGENT_COMMANDS sample was incomplete).  
- Do **not** invent new i18n keys for weekday names (use `Intl`).  
- Optional comma after “Yesterday” is **not** required — keep current `yesterdayAt` copy.

### Shared-list impact

Inbox already calls `formatMessageTime` for `lastMessage.sentAt`. This-week change applies there too — **allowed** and preferred for consistency.

---

## Locked implementation touchpoints

| Path | Change |
|------|--------|
| `conversation-display.ts` | Add this-week branch in `formatMessageTime` |
| `conversation-display.spec.ts` | Unit coverage for buckets (fake timers / fixed `now`) |
| `[id]/page.tsx` | **Only if** layout drifts from lock — prefer **no visual churn** if already compliant |
| `[id]/page.spec.tsx` | Keep always-visible assert; add/adjust cases for yesterday / this-week / older if helpful |

No dating-api changes. No new components required.

---

## Out of scope

- Date separators between message groups  
- Relative “2h ago” for ≥ 1h today  
- Read receipts / delivery ticks  
- Editing `createdAt` contract  
- Hover-to-reveal absolute time tooltip  

---

## Tests (required)

- `formatMessageTime`: justNow / minutesAgo / today clock / yesterday / **weekday this week** / older medium+time  
- Thread: each bubble renders `conversation-message-time` with visible text (mine + peer)  
- Specs green  

---

## Acceptance criteria

- [x] Timestamp always visible below each bubble (sent + received)  
- [x] Format buckets: recent / today clock / yesterday / this-week weekday / older date  
- [x] Subtle color; dark mode OK  
- [x] Mobile layout OK (no hover dependency)  
- [x] Shared helper covered by unit tests  
- [x] Specs green  

---

## Agent 1 status

**Complete** — see `handoffs/STORY_03_message_timestamps/agent-1-implement.md`

## Agent 2 status

**PASS** — see `handoffs/STORY_03_message_timestamps/agent-2-cr.md`

## Agent 3 status

**ACCEPT** — see `handoffs/STORY_03_message_timestamps/agent-3-pm.md`

## Next

```
--agent 0 sprint 34 story 4 content
```
