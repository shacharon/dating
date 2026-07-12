# Story 4: Product funnel analytics

**Sprint:** 7  
**Status:** **Done** (engineering gate; operator log smoke pending)  
**Closeout order:** 9 (last) — **closed 2026-06-03**  
**Depends on:** Sprint 5 Story 2 (Sentry)

---

## Why

There is no visibility into the product funnel: profile submit → match shown → like/pass → mutual match → first message. Without analytics, score calibration, feature impact, and WS stability cannot be measured. Structured events enable data-driven iteration.

---

## What

**As a** product owner  
**I want** key user actions tracked as structured events  
**So that** I can measure conversion and diagnose drop-off

### Acceptance criteria

- [x] **Event schema defined** — stable event names and properties (no PII in properties):
  - `profile.submitted`
  - `match.list_viewed`
  - `match.action` (like | pass | block | undo)
  - `match.mutual_created`
  - `conversation.opened`
  - `message.sent` (conversationId hash only, no body)
  - `messaging.ws_connected` / `messaging.ws_disconnected`
- [x] **API emission** — server-side events on state transitions (match action, mutual create, message send)
- [ ] **UI emission (optional)** — client events for page views if using client SDK *(deferred)*
- [x] **Provider** — structured log sink v1 (env-gated); PostHog v2 follow-up
- [x] **PII policy** — no email, name, message text, or profile content in event payloads
- [x] **Sentry separation** — analytics events ≠ error events
- [x] **Tests** — unit test that event emitter called on match action; mock provider
- [x] **Dashboard doc** — `docs/analytics/PRODUCT_FUNNEL.md`

### Out of scope (this story)

- Full data warehouse / ETL
- A/B testing framework
- Revenue analytics

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_04_product_funnel_analytics/agent-0-architect.md` after architect run.

Suggested module: `dating-api/src/analytics/` with `AnalyticsService.track(event, properties)`.

Integration points:
- `MeMatchActionsService` — like/pass/block
- Mutual match detection service
- `MeConversationMessagesService.sendMessage()`
- `MessagingGateway.handleConnection` / disconnect

---

## Definition of done

- [x] Event schema documented
- [x] ≥5 key events emitting in API (8 events)
- [x] Provider wired (`logKind: product_analytics` JSON lines)
- [x] PII audit in code review
- [x] `.env.example` updated

---

## Agent run

```text
--agent 0 sprint 7 story 4
--agent 1 sprint 7 story 4
--agent 2 sprint 7 story 4
--agent 3 sprint 7 story 4
```

Handoffs: `handoffs/STORY_04_product_funnel_analytics/agent-*.md`

---

## Manual smoke

1. Submit profile → `profile.submitted` event visible  
2. Like a match → `match.action` with action=like  
3. Mutual like → `match.mutual_created` for both users  
4. Send message → `message.sent` without body content  
5. Connect WS → `messaging.ws_connected`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| UI page-view tracking | optional follow-up |
| Score calibration from outcomes | needs months of data |
