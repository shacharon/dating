# Story 1: Email push notifications

**Sprint:** 6  
**Status:** Done (engineering gate — manual Resend smoke pending operator)  
**Depends on:** Sprint 4 (realtime messaging)

---

## Why

Users only see new matches and messages when in-app. Without push notifications, mutual matches and messages go unnoticed — critical retention gap for a dating product. Email is the minimum viable channel (no mobile app).

---

## What

**As a** user who is not currently in the app  
**I want** email alerts for mutual matches and new messages  
**So that** I don't miss connections

### Acceptance criteria

- [x] **Email provider integrated** — Resend via env config (`EMAIL_PROVIDER`, `RESEND_API_KEY`); noop when `disabled` (local default)
- [x] **Mutual match email** — sent to both users when `MutualMatch` created (`created: true` only)
- [x] **New message email** — sent to recipient when message persisted AND recipient has no active WS connection (v1: WS check; N-minute offline fallback deferred)
- [x] **Debounce** — max 1 message email per conversation per 15 minutes (`EMAIL_MESSAGE_DEBOUNCE_MINUTES`)
- [x] **User email source** — `User.email` from Google auth
- [x] **Unsubscribe link** — HMAC token; `User.emailNotificationsEnabled` opt-out
- [x] **No message body in email** — nickname + deep link only
- [x] **Structured log + Sentry** — trace/error codes shipped; failures non-blocking. Sentry hook deferred to Sprint 5 Story 2 if not merged
- [x] **Tests** — unit tests with mocked provider; hook + unsubscribe HTTP integration (230/230 story suite)

### Out of scope (this story)

- SMS / mobile push
- In-app notification center
- Digest / weekly summary emails
- Marketing emails

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_01_email_push_notifications/agent-0-architect.md`.

Integration points:
- `MutualMatchesService.detectAndCreateMutualMatch()` → `{ created }`
- `MeMatchActionsService.createAction()` → mutual-match email hook
- `MeConversationMessagesService.sendMessage()` → new-message email hook
- `MessagingSocketRegistry.hasActiveConnection(userId)`
- `src/notifications/` module

---

## Definition of done

- [x] Email provider wired and env-documented (`.env.example`)
- [x] Mutual match email trigger tested (unit + service hook; `mutual-match-email.service.spec.ts`)
- [x] Message email debounced and skipped when user online via WS
- [x] Unsubscribe mechanism exists (`GET /api/v1/notifications/email/unsubscribe`)
- [x] `.env.example` updated

---

## Shipped (2026-06-03)

| Area | Deliverable |
|------|-------------|
| Schema | `User.emailNotificationsEnabled` + migration |
| Module | `NotificationsModule` — Resend/noop, debounce, unsubscribe |
| Hooks | Mutual match + new message best-effort emails |
| Registry | `MessagingSocketRegistry.hasActiveConnection()` |
| Tests | 22 new + extended specs; story suite 230/230 |

Handoffs: `handoffs/STORY_01_email_push_notifications/agent-*.md`

---

## Manual smoke

**Pending operator** — requires Resend API key, verified `EMAIL_FROM` domain, real inbox.

1. Two users like each other → both receive mutual match email  
2. User B closes app / disconnects WS → User A sends message → User B receives email  
3. User B online via WS → User A sends message → no email (or debounced)  
4. Click unsubscribe → no further emails for that user

Local noop mode (`EMAIL_PROVIDER=disabled`): emails skipped with `EMAIL_SKIPPED_PROVIDER_DISABLED` trace — sufficient for dev.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Manual Resend smoke + DNS/SPF | Operator |
| Sentry on email failures | Sprint 5 Story 2 |
| Redis-backed debounce (multi-instance) | Sprint 7 |
| In-app notification bell | future sprint |
| SMS | future sprint |
